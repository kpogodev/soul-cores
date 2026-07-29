"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, teamMembers, teamJoinRequests, teamSoulCores, teamSoulCoreStatus } from "@/lib/schema";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { eq, and, isNull } from "drizzle-orm";

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Nie jesteś zalogowany");
  return session;
}

export async function createTeam(name: string) {
  const session = await requireSession();
  if (!name.trim()) throw new Error("Nazwa drużyny nie może być pusta");

  const teamId = randomUUID();

  await db.insert(teams).values({
    id: teamId,
    name: name.trim(),
    organizerId: session.user.id,
  });

  await db.insert(teamMembers).values({
    teamId,
    userId: session.user.id,
    role: "organizer",
  });

  revalidatePath("/dashboard");
  return teamId;
}

export async function requestJoinTeam(teamId: string) {
  const session = await requireSession();

  await db
    .insert(teamJoinRequests)
    .values({
      id: randomUUID(),
      teamId,
      userId: session.user.id,
      status: "pending",
    })
    .onConflictDoNothing(); // unique(teamId, userId) - nie dubluj prośby

  revalidatePath("/dashboard");
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

export async function acceptJoinRequest(requestId: string, teamId: string) {
  const session = await requireSession();
  await requireOrganizer(teamId, session.user.id);

  const [request] = await db
    .select()
    .from(teamJoinRequests)
    .where(eq(teamJoinRequests.id, requestId));

  if (!request) throw new Error("Nie znaleziono prośby");

  await db
    .update(teamJoinRequests)
    .set({ status: "accepted" })
    .where(eq(teamJoinRequests.id, requestId));

  await db
    .insert(teamMembers)
    .values({ teamId, userId: request.userId, role: "member" })
    .onConflictDoNothing();

  // Backfill: nowy członek dołącza do statusów wszystkich aktywnych
  // (jeszcze niezamkniętych) wpisów w puli - inaczej nie liczyłby się
  // jako płacący/uczestnik dla core'ów dodanych przed jego dołączeniem.
  const activeEntries = await db
    .select({ id: teamSoulCores.id })
    .from(teamSoulCores)
    .where(
      and(
        eq(teamSoulCores.teamId, teamId),
        eq(teamSoulCores.status, "accepted"),
        isNull(teamSoulCores.closedAt)
      )
    );

  if (activeEntries.length > 0) {
    await db
      .insert(teamSoulCoreStatus)
      .values(
        activeEntries.map((e) => ({
          teamSoulCoreId: e.id,
          userId: request.userId,
          completed: false,
        }))
      )
      .onConflictDoNothing();
  }

  revalidatePath(`/teams/${teamId}`);
}

export async function rejectJoinRequest(requestId: string, teamId: string) {
  const session = await requireSession();
  await requireOrganizer(teamId, session.user.id);

  await db
    .update(teamJoinRequests)
    .set({ status: "rejected" })
    .where(eq(teamJoinRequests.id, requestId));

  revalidatePath(`/teams/${teamId}`);
}