"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { acceptJoinRequest, rejectJoinRequest } from "@/lib/actions/teams";

export function JoinRequestActions({
  requestId,
  teamId,
}: {
  requestId: string;
  teamId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(() => acceptJoinRequest(requestId, teamId))
        }
        className="soul-slot flex size-8 items-center justify-center text-soul disabled:opacity-40"
        data-glow="soul"
        aria-label="Akceptuj"
      >
        <Check className="size-4" />
      </button>
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(() => rejectJoinRequest(requestId, teamId))
        }
        className="soul-slot flex size-8 items-center justify-center text-muted-foreground disabled:opacity-40"
        aria-label="Odrzuć"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}