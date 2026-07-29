"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { requestJoinTeam } from "@/lib/actions/teams";

export function JoinTeamButton({
  teamId,
  alreadyRequested,
}: {
  teamId: string;
  alreadyRequested: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [requested, setRequested] = useState(alreadyRequested);

  if (requested) {
    return (
      <Button size="sm" variant="secondary" disabled>
        Oczekuje na akceptację
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await requestJoinTeam(teamId);
          setRequested(true);
        })
      }
    >
      Poproś o dołączenie
    </Button>
  );
}