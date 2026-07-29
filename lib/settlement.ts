type Participant = {
  userId: string;
  name: string;
  completed: boolean;
  paidShare: string | null;
  paid: boolean;
};

type PoolEntry = {
  status: "pending" | "accepted" | "rejected";
  price: string | null;
  creature: string;
  suppliedBy: string;
  supplierName: string;
  closedAt: Date | null;
  participants: Participant[];
};

export type DebtLine = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  creature: string;
  amount: number;
};

export type AggregatedDebt = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
};

/** Sumuje długi per para (bez rozbicia na stworzenia) - do sekcji "Łącznie" */
export function aggregateTotals(lines: DebtLine[]): AggregatedDebt[] {
  const map = new Map<string, AggregatedDebt>();
  for (const line of lines) {
    const key = `${line.fromId}->${line.toId}`;
    const existing = map.get(key);
    if (existing) {
      existing.amount += line.amount;
    } else {
      map.set(key, {
        fromId: line.fromId,
        fromName: line.fromName,
        toId: line.toId,
        toName: line.toName,
        amount: line.amount,
      });
    }
  }
  return Array.from(map.values()).filter((l) => l.amount > 0);
}
/** Realne długi - każdy zamrożony paidShare (czy z pojedynczej akcji "zrobiłem run", czy z bulk zamknięcia wpisu) */
export function buildFinalizedLedger(entries: PoolEntry[]): DebtLine[] {
  const lines: DebtLine[] = [];

  for (const entry of entries) {
    if (entry.status !== "accepted") continue;

    for (const p of entry.participants) {
      if (p.userId === entry.suppliedBy) continue;
      if (!p.paidShare) continue;
      if (p.paid) continue; // już oddane - nie jest to już dług

      lines.push({
        fromId: p.userId,
        fromName: p.name,
        toId: entry.suppliedBy,
        toName: entry.supplierName,
        creature: entry.creature,
        amount: Number(p.paidShare),
      });
    }
  }

  return lines;
}

/** Szacunkowe długi - osoby które jeszcze nic nie zaznaczyły (ani zwolnienia, ani "zrobiłem run") */
export function buildEstimatedLedger(entries: PoolEntry[]): DebtLine[] {
  const lines: DebtLine[] = [];

  for (const entry of entries) {
    if (entry.status !== "accepted" || entry.closedAt || !entry.price) continue;

    const payers = entry.participants.filter(
      (p) => p.userId !== entry.suppliedBy && !p.completed
    );
    if (payers.length === 0) continue;

    const share = Number(entry.price) / payers.length;

    for (const p of payers) {
      lines.push({
        fromId: p.userId,
        fromName: p.name,
        toId: entry.suppliedBy,
        toName: entry.supplierName,
        creature: entry.creature,
        amount: share,
      });
    }
  }

  return lines;
}