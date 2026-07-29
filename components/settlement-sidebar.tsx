import { ArrowRight, Coins } from "lucide-react";
import { formatGp } from "@/lib/utils";
import { aggregateTotals, type DebtLine, type AggregatedDebt } from "@/lib/settlement";

export function SettlementSidebar({
  finalized,
  estimated,
}: {
  finalized: DebtLine[];
  estimated: DebtLine[];
}) {
  const hasAnything = finalized.length > 0 || estimated.length > 0;

  return (
    <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
      <div className="flex items-center gap-2">
        <Coins className="size-4 text-gold" />
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Rozliczenia
        </h2>
      </div>

      {!hasAnything && (
        <div className="soul-slot p-4 text-center text-xs text-muted-foreground">
          Brak długów do rozliczenia.
        </div>
      )}

      {finalized.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Do zapłaty</p>
          {finalized.map((line, i) => (
            <DebtRow key={i} line={line} />
          ))}
          <TotalsBlock lines={finalized} />
        </div>
      )}

      {estimated.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Szacunkowo (aktywne wpisy, jeszcze niezamknięte)
          </p>
          {estimated.map((line, i) => (
            <DebtRow key={i} line={line} dashed />
          ))}
          <TotalsBlock lines={estimated} dashed />
        </div>
      )}
    </aside>
  );
}

function TotalsBlock({ lines, dashed }: { lines: DebtLine[]; dashed?: boolean }) {
  const totals = aggregateTotals(lines);
  if (totals.length === 0) return null;

  return (
    <div className="ml-2 space-y-1 border-l border-border pl-3 pt-1">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
        Łącznie
      </p>
      {totals.map((t, i) => (
        <TotalRow key={i} total={t} dashed={dashed} />
      ))}
    </div>
  );
}

function TotalRow({ total, dashed }: { total: AggregatedDebt; dashed?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-2 text-xs ${
        dashed ? "opacity-80" : ""
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-medium">{total.fromName}</span>
        <ArrowRight className="size-3 text-muted-foreground" />
        <span className="font-medium">{total.toName}</span>
      </div>
      <span className="text-gold">{formatGp(total.amount.toFixed(2))} gp</span>
    </div>
  );
}

function DebtRow({ line, dashed }: { line: DebtLine; dashed?: boolean }) {
  return (
    <div
      className={`soul-slot flex items-center justify-between gap-2 p-3 text-xs ${
        dashed ? "border-dashed opacity-80" : ""
      }`}
    >
      <div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{line.fromName}</span>
          <ArrowRight className="size-3 text-muted-foreground" />
          <span className="font-medium">{line.toName}</span>
        </div>
        <p className="text-muted-foreground">za {line.creature}</p>
      </div>
      <span className="shrink-0 text-gold">{formatGp(line.amount.toFixed(2))} gp</span>
    </div>
  );
}