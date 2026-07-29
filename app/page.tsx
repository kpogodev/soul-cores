import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginButton } from "@/components/login-button";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* poświata w tle - ambient, wyciszona */}
      <div
        aria-hidden
        className="soul-sigil-glow pointer-events-none absolute size-[36rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--soul)_28%,transparent)_0%,transparent_70%)] blur-2xl"
      />

      <div className="relative flex flex-col items-center gap-8 text-center">
        <SoulSigil />

        <div className="space-y-2">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Soulpit Organizer
          </h1>
          <p className="max-w-sm text-balance text-muted-foreground">
            Umawiajcie się na Soulpity, śledźcie kto ma co zrobione i
            rozliczajcie się z kontrybucji.
          </p>
        </div>

        <LoginButton />
      </div>
    </main>
  );
}

/** Abstrakcyjny sigil - kręgi run + rdzeń, w stylu "duszy" złapanej w kamiennym kręgu */
function SoulSigil() {
  return (
    <svg
      width="112"
      height="112"
      viewBox="0 0 112 112"
      fill="none"
      className="relative"
      aria-hidden
    >
      <circle
        cx="56"
        cy="56"
        r="50"
        stroke="var(--border)"
        strokeWidth="1.5"
      />
      <circle
        cx="56"
        cy="56"
        r="38"
        stroke="var(--soul)"
        strokeOpacity="0.5"
        strokeWidth="1"
        strokeDasharray="3 7"
      />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const x1 = 56 + Math.cos(angle) * 44;
        const y1 = 56 + Math.sin(angle) * 44;
        const x2 = 56 + Math.cos(angle) * 50;
        const y2 = 56 + Math.sin(angle) * 50;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--border)"
            strokeWidth="1.5"
          />
        );
      })}
      <circle cx="56" cy="56" r="14" fill="var(--soul)" fillOpacity="0.15" />
      <circle
        cx="56"
        cy="56"
        r="14"
        stroke="var(--soul)"
        strokeWidth="1.5"
      />
      <circle cx="56" cy="56" r="4" fill="var(--soul)" />
    </svg>
  );
}