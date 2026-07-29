"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamMembers, teamSoulCores, teamSoulCoreStatus } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Nie jesteś zalogowany");
  return session;
}

async function requireOrganizer(teamId: string, userId: string) {
  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

  if (!membership || membership.role !== "organizer") {
    throw new Error("Tylko organizator może to zrobić");
  }
}

/** Członek proponuje dodanie soul core'a do puli - czeka na akceptację */
export async function proposeSoulCore(
  teamId: string,
  soulCoreId: string,
  price: string
) {
  const session = await requireSession();

  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, session.user.id)));

  if (!membership) throw new Error("Nie jesteś członkiem tej drużyny");

  await db.insert(teamSoulCores).values({
    id: randomUUID(),
    teamId,
    soulCoreId,
    suppliedBy: session.user.id,
    price: price || null,
    status: "pending",
  });

  revalidatePath(`/teams/${teamId}`);
}

/** Organizator akceptuje wpis - tworzy statusy dla wszystkich aktualnych członków */
export async function acceptSoulCoreEntry(entryId: string, teamId: string) {
  const session = await requireSession();
  await requireOrganizer(teamId, session.user.id);

  await db
    .update(teamSoulCores)
    .set({ status: "accepted" })
    .where(eq(teamSoulCores.id, entryId));

  const members = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  if (members.length > 0) {
    await db
      .insert(teamSoulCoreStatus)
      .values(
        members.map((m) => ({
          teamSoulCoreId: entryId,
          userId: m.userId,
          completed: false,
        }))
      )
      .onConflictDoNothing();
  }

  revalidatePath(`/teams/${teamId}`);
}

export async function rejectSoulCoreEntry(entryId: string, teamId: string) {
  const session = await requireSession();
  await requireOrganizer(teamId, session.user.id);

  await db
    .update(teamSoulCores)
    .set({ status: "rejected" })
    .where(eq(teamSoulCores.id, entryId));

  revalidatePath(`/teams/${teamId}`);
}

/** Organizator ręcznie zmienia kto dostarczył dany wpis */
export async function updateSupplier(
  entryId: string,
  teamId: string,
  newSupplierId: string
) {
  const session = await requireSession();
  await requireOrganizer(teamId, session.user.id);

  await db
    .update(teamSoulCores)
    .set({ suppliedBy: newSupplierId })
    .where(eq(teamSoulCores.id, entryId));

  revalidatePath(`/teams/${teamId}`);
}

/** Organizator usuwa wpis z puli (razem ze statusami uczestników - kaskadowo) */
export async function deleteSoulCoreEntry(entryId: string, teamId: string) {
  const session = await requireSession();
  await requireOrganizer(teamId, session.user.id);

  await db.delete(teamSoulCores).where(eq(teamSoulCores.id, entryId));

  revalidatePath(`/teams/${teamId}`);
}

/**
 * Organizator zamyka wpis po tym jak run się odbył.
 * Płacący = członkowie (bez dostawcy) którzy jeszcze nie mieli zaznaczone "zrobione".
 * Cena dzieli się między nich, kwota zamraża się na stałe, a status wszystkich
 * płacących przechodzi na "zrobione" (bo właśnie zrobili run).
 */
export async function closeSoulCoreEntry(entryId: string, teamId: string) {
  const session = await requireSession();
  await requireOrganizer(teamId, session.user.id);

  const [entry] = await db
    .select()
    .from(teamSoulCores)
    .where(eq(teamSoulCores.id, entryId));

  if (!entry) throw new Error("Nie znaleziono wpisu");
  if (entry.closedAt) throw new Error("Wpis jest już zamknięty");

  const statuses = await db
    .select()
    .from(teamSoulCoreStatus)
    .where(eq(teamSoulCoreStatus.teamSoulCoreId, entryId));

  const payers = statuses.filter(
    (s) => s.userId !== entry.suppliedBy && !s.completed
  );

  const price = entry.price ? Number(entry.price) : 0;
  const share = payers.length > 0 ? price / payers.length : 0;

  for (const payer of payers) {
    await db
      .update(teamSoulCoreStatus)
      .set({
        completed: true,
        completedAt: new Date(),
        paidShare: share.toFixed(2),
      })
      .where(
        and(
          eq(teamSoulCoreStatus.teamSoulCoreId, entryId),
          eq(teamSoulCoreStatus.userId, payer.userId)
        )
      );
  }

  await db
    .update(teamSoulCores)
    .set({ closedAt: new Date() })
    .where(eq(teamSoulCores.id, entryId));

  revalidatePath(`/teams/${teamId}`);
}

/** Odznaczenie "mam już zrobione" dla danego wpisu w puli */
export async function toggleMyCompletion(entryId: string, teamId: string) {
  const session = await requireSession();

  const [existing] = await db
    .select()
    .from(teamSoulCoreStatus)
    .where(
      and(
        eq(teamSoulCoreStatus.teamSoulCoreId, entryId),
        eq(teamSoulCoreStatus.userId, session.user.id)
      )
    );

  if (existing) {
    await db
      .update(teamSoulCoreStatus)
      .set({
        completed: !existing.completed,
        completedAt: !existing.completed ? new Date() : null,
      })
      .where(
        and(
          eq(teamSoulCoreStatus.teamSoulCoreId, entryId),
          eq(teamSoulCoreStatus.userId, session.user.id)
        )
      );
  } else {
    // uczestnik dodany "z zewnątrz" bez wcześniejszego wiersza - tworzymy przy pierwszym kliknięciu
    await db.insert(teamSoulCoreStatus).values({
      teamSoulCoreId: entryId,
      userId: session.user.id,
      completed: true,
      completedAt: new Date(),
    });
  }

  revalidatePath(`/teams/${teamId}`);
}

/** Dostawca odhacza że dana osoba faktycznie mu zapłaciła */
export async function markParticipantPaid(
  entryId: string,
  teamId: string,
  targetUserId: string,
  paid: boolean
) {
  const session = await requireSession();

  const [entry] = await db
    .select()
    .from(teamSoulCores)
    .where(eq(teamSoulCores.id, entryId));

  if (!entry) throw new Error("Nie znaleziono wpisu");
  if (entry.suppliedBy !== session.user.id) {
    throw new Error("Tylko dostawca może odhaczać wpłaty");
  }

  await db
    .update(teamSoulCoreStatus)
    .set({ paid })
    .where(
      and(
        eq(teamSoulCoreStatus.teamSoulCoreId, entryId),
        eq(teamSoulCoreStatus.userId, targetUserId)
      )
    );

  revalidatePath(`/teams/${teamId}`);
}