import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, teamMembers, teamJoinRequests, soulCores, teamSoulCores, teamSoulCoreStatus } from "@/lib/schema";
import { user } from "@/lib/auth-schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { Crown, User as UserIcon } from "lucide-react";
import { JoinRequestActions } from "@/components/join-request-actions";
import { AddSoulCoreDialog } from "@/components/add-soul-core-dialog";
import { SoulCorePool } from "@/components/soul-core-pool";
import { SettlementSidebar } from "@/components/settlement-sidebar";
import { buildFinalizedLedger, buildEstimatedLedger } from "@/lib/settlement";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) notFound();

  const [myMembership] = await db
    .select()
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, session.user.id))
    );

  if (!myMembership) {
    // nie jesteś członkiem tej drużyny - nie ma tu czego szukać
    redirect("/dashboard");
  }

  const isOrganizer = myMembership.role === "organizer";

  const members = await db
    .select({
      userId: teamMembers.userId,
      role: teamMembers.role,
      name: user.name,
      image: user.image,
    })
    .from(teamMembers)
    .innerJoin(user, eq(user.id, teamMembers.userId))
    .where(eq(teamMembers.teamId, teamId));

  const pendingRequests = isOrganizer
    ? await db
        .select({
          id: teamJoinRequests.id,
          userId: teamJoinRequests.userId,
          name: user.name,
          image: user.image,
        })
        .from(teamJoinRequests)
        .innerJoin(user, eq(user.id, teamJoinRequests.userId))
        .where(
          and(
            eq(teamJoinRequests.teamId, teamId),
            eq(teamJoinRequests.status, "pending")
          )
        )
    : [];

  const allSoulCores = await db
    .select({ id: soulCores.id, creature: soulCores.creature, img: soulCores.img })
    .from(soulCores);

  const poolRows = await db
    .select({
      id: teamSoulCores.id,
      status: teamSoulCores.status,
      price: teamSoulCores.price,
      suppliedBy: teamSoulCores.suppliedBy,
      closedAt: teamSoulCores.closedAt,
      creature: soulCores.creature,
      img: soulCores.img,
      supplierName: user.name,
    })
    .from(teamSoulCores)
    .innerJoin(soulCores, eq(soulCores.id, teamSoulCores.soulCoreId))
    .innerJoin(user, eq(user.id, teamSoulCores.suppliedBy))
    .where(eq(teamSoulCores.teamId, teamId));

  // Pełna lista statusów (wszyscy uczestnicy, nie tylko ja) dla wpisów tej drużyny
  const allStatuses = await db
    .select({
      teamSoulCoreId: teamSoulCoreStatus.teamSoulCoreId,
      userId: teamSoulCoreStatus.userId,
      completed: teamSoulCoreStatus.completed,
      paidShare: teamSoulCoreStatus.paidShare,
      paid: teamSoulCoreStatus.paid,
      name: user.name,
    })
    .from(teamSoulCoreStatus)
    .innerJoin(teamSoulCores, eq(teamSoulCores.id, teamSoulCoreStatus.teamSoulCoreId))
    .innerJoin(user, eq(user.id, teamSoulCoreStatus.userId))
    .where(eq(teamSoulCores.teamId, teamId));

  const statusesByEntry = new Map<string, typeof allStatuses>();
  for (const s of allStatuses) {
    const list = statusesByEntry.get(s.teamSoulCoreId) ?? [];
    list.push(s);
    statusesByEntry.set(s.teamSoulCoreId, list);
  }

  const poolEntries = poolRows.map((row) => ({
    id: row.id,
    status: row.status,
    price: row.price,
    creature: row.creature,
    img: row.img,
    suppliedBy: row.suppliedBy,
    supplierName: row.supplierName,
    closedAt: row.closedAt,
    participants: (statusesByEntry.get(row.id) ?? []).map((s) => ({
      userId: s.userId,
      name: s.name,
      completed: s.completed,
      paidShare: s.paidShare,
      paid: s.paid,
    })),
  }));

  const finalizedLedger = buildFinalizedLedger(poolEntries);
  const estimatedLedger = buildEstimatedLedger(poolEntries);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
        <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {team.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {members.length} {members.length === 1 ? "członek" : "członków"}
        </p>
      </div>

      {isOrganizer && pendingRequests.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Prośby o dołączenie
          </h2>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="soul-slot flex items-center justify-between gap-3 p-3"
                data-glow="gold"
              >
                <div className="flex items-center gap-3">
                  <MemberAvatar image={req.image} />
                  <span className="font-medium">{req.name}</span>
                </div>
                <JoinRequestActions requestId={req.id} teamId={teamId} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Członkowie
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {members.map((m) => (
            <div
              key={m.userId}
              className="soul-slot flex items-center gap-3 p-3"
            >
              <MemberAvatar image={m.image} />
              <span className="flex-1 font-medium">{m.name}</span>
              {m.role === "organizer" && (
                <Crown className="size-4 text-gold" aria-label="Organizator" />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Pula soul core&apos;ów
          </h2>
          <AddSoulCoreDialog
            teamId={teamId}
            soulCores={allSoulCores}
          />
        </div>
        <SoulCorePool
          teamId={teamId}
          entries={poolEntries}
          isOrganizer={isOrganizer}
          members={members.map((m) => ({ userId: m.userId, name: m.name }))}
          currentUserId={session.user.id}
        />
      </section>
        </div>

        <SettlementSidebar finalized={finalizedLedger} estimated={estimatedLedger} />
      </div>
    </main>
  );
}

function MemberAvatar({ image }: { image: string | null }) {
  return (
    <div className="soul-slot flex size-9 shrink-0 items-center justify-center overflow-hidden">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        <UserIcon className="size-4 text-muted-foreground" />
      )}
    </div>
  );
}