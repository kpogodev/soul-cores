"use client";

import { MessagesSquare } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function LoginButton() {
  return (
    <button
      onClick={() =>
        authClient.signIn.social({
          provider: "discord",
          callbackURL: "/dashboard",
        })
      }
      className="group inline-flex items-center gap-2.5 rounded-md border border-border bg-surface px-5 py-2.5 font-medium text-foreground transition-colors hover:border-[color-mix(in_oklab,var(--soul)_45%,var(--border))] hover:bg-[color-mix(in_oklab,var(--soul)_8%,var(--surface))]"
    >
      <MessagesSquare className="size-4 text-soul" />
      Zaloguj przez Discord
    </button>
  );
}