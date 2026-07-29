import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teams, teamMembers, teamJoinRequests } from "@/lib/schema";
import { eq, and, notInArray, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, Plus, Clock } from "lucide-react";
import { CreateTeamDialog } from "@/components/create-team-dialog";
import { JoinTeamButton } from "@/components/join-team-button";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const userId = session.user.id;

  const myMemberships = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));

  const myTeamIds = myMemberships.map((m) => m.teamId);

  const myTeams = myTeamIds.length
    ? await db.select().from(teams).where(inArray(teams.id, myTeamIds))
    : [];

  const otherTeams = myTeamIds.length
    ? await db.select().from(teams).where(notInArray(teams.id, myTeamIds))
    : await db.select().from(teams);

  const myPendingRequests = await db
    .select({ teamId: teamJoinRequests.teamId })
    .from(teamJoinRequests)
    .where(
      and(
        eq(teamJoinRequests.userId, userId),
        eq(teamJoinRequests.status, "pending")
      )
    );

  const pendingTeamIds = new Set(myPendingRequests.map((r) => r.teamId));

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Twoje ekipy
          </h1>
          <p className="text-sm text-muted-foreground">
            Witaj, {session.user.name}
          </p>
        </div>
        <SignOutButton />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Moje drużyny
          </h2>
          <CreateTeamDialog />
        </div>

        {myTeams.length === 0 ? (
          <EmptySlot
            icon={<Plus className="size-5" />}
            label="Nie należysz jeszcze do żadnej drużyny — stwórz pierwszą."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {myTeams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                data-glow="soul"
                className="soul-slot flex items-center gap-3 p-4"
              >
                <div
                  data-glow="soul"
                  className="soul-slot flex size-10 shrink-0 items-center justify-center"
                >
                  <Users className="size-4 text-soul" />
                </div>
                <span className="font-medium">{team.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Dołącz do drużyny
        </h2>

        {otherTeams.length === 0 ? (
          <EmptySlot
            icon={<Users className="size-5" />}
            label="Brak innych drużyn w systemie."
          />
        ) : (
          <div className="space-y-2">
            {otherTeams.map((team) => (
              <div
                key={team.id}
                className="soul-slot flex items-center justify-between gap-3 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="soul-slot flex size-10 shrink-0 items-center justify-center">
                    <Users className="size-4 text-muted-foreground" />
                  </div>
                  <span className="font-medium">{team.name}</span>
                </div>
                {pendingTeamIds.has(team.id) ? (
                  <span className="flex items-center gap-1.5 text-sm text-gold">
                    <Clock className="size-3.5" />
                    Oczekuje
                  </span>
                ) : (
                  <JoinTeamButton
                    teamId={team.id}
                    alreadyRequested={false}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function EmptySlot({
  icon,
  label,
}: {
  icon: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className="soul-slot flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
      {icon}
      <p className="text-sm">{label}</p>
    </div>
  );
}