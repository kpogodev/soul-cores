"use client";

import { useTransition } from "react";
import { Check, X, Coins, Trash2, Lock } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatGp } from "@/lib/utils";
import {
  acceptSoulCoreEntry,
  rejectSoulCoreEntry,
  toggleMyCompletion,
  updateSupplier,
  deleteSoulCoreEntry,
  closeSoulCoreEntry,
  markParticipantPaid,
} from "@/lib/actions/soul-cores";

type Member = { userId: string; name: string };

type Participant = {
  userId: string;
  name: string;
  completed: boolean;
  paidShare: string | null;
  paid: boolean;
};

type PoolEntry = {
  id: string;
  status: "pending" | "accepted" | "rejected";
  price: string | null;
  creature: string;
  img: string;
  suppliedBy: string;
  supplierName: string;
  closedAt: Date | null;
  participants: Participant[];
};

export function SoulCorePool({
  teamId,
  entries,
  isOrganizer,
  members,
  currentUserId,
}: {
  teamId: string;
  entries: PoolEntry[];
  isOrganizer: boolean;
  members: Member[];
  currentUserId: string;
}) {
  const pending = entries.filter((e) => e.status === "pending");
  const active = entries.filter((e) => e.status === "accepted" && !e.closedAt);
  const closed = entries.filter((e) => e.status === "accepted" && e.closedAt);

  if (entries.length === 0) {
    return (
      <div className="soul-slot flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
        <p className="text-sm">Pula jest pusta — dodaj pierwszy soul core.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Czeka na akceptację
          </p>
          {pending.map((entry) => (
            <PendingRow
              key={entry.id}
              entry={entry}
              teamId={teamId}
              members={members}
              isOrganizer={isOrganizer}
            />
          ))}
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-2">
          {pending.length > 0 && (
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Aktywne
            </p>
          )}
          {active.map((entry) => (
            <ActiveEntry
              key={entry.id}
              entry={entry}
              teamId={teamId}
              members={members}
              isOrganizer={isOrganizer}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <div className="space-y-3 border-t border-border pt-6">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
              Ukończone
            </h3>
          </div>
          <div className="space-y-2">
            {closed.map((entry) => (
              <ClosedEntry key={entry.id} entry={entry} teamId={teamId} currentUserId={currentUserId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SupplierSelect({
  entry,
  teamId,
  members,
}: {
  entry: PoolEntry;
  teamId: string;
  members: Member[];
}) {
  const [isPending, startTransition] = useTransition();
  const currentLabel =
    members.find((m) => m.userId === entry.suppliedBy)?.name ?? "?";

  return (
    <Select
      value={entry.suppliedBy}
      disabled={isPending}
      onValueChange={(value) => {
        if (!value) return;
        startTransition(() => updateSupplier(entry.id, teamId, value));
      }}
    >
      <SelectTrigger size="sm" className="h-6 border-0 px-1 text-xs shadow-none">
        <SelectValue>{currentLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {members.map((m) => (
          <SelectItem key={m.userId} value={m.userId}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DeleteButton({ entryId, teamId }: { entryId: string; teamId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => deleteSoulCoreEntry(entryId, teamId))}
      className="soul-slot flex size-8 items-center justify-center text-destructive disabled:opacity-40"
      aria-label="Usuń z puli"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

function PendingRow({
  entry,
  teamId,
  members,
  isOrganizer,
}: {
  entry: PoolEntry;
  teamId: string;
  members: Member[];
  isOrganizer: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className="soul-slot flex items-center justify-between gap-3 p-3"
      data-glow="gold"
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/soul-cores/images/${entry.img}`} alt="" className="size-8" />
        <div>
          <p className="font-medium">{entry.creature}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            dostarcza{" "}
            {isOrganizer ? (
              <SupplierSelect entry={entry} teamId={teamId} members={members} />
            ) : (
              entry.supplierName
            )}
            {entry.price && ` · ${formatGp(entry.price)} gp`}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {isOrganizer ? (
          <>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => acceptSoulCoreEntry(entry.id, teamId))}
              className="soul-slot flex size-8 items-center justify-center text-soul disabled:opacity-40"
              data-glow="soul"
              aria-label="Akceptuj"
            >
              <Check className="size-4" />
            </button>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => rejectSoulCoreEntry(entry.id, teamId))}
              className="soul-slot flex size-8 items-center justify-center text-muted-foreground disabled:opacity-40"
              aria-label="Odrzuć"
            >
              <X className="size-4" />
            </button>
            <DeleteButton entryId={entry.id} teamId={teamId} />
          </>
        ) : (
          <span className="text-xs text-gold">Czeka na organizatora</span>
        )}
      </div>
    </div>
  );
}

function MyStatusButton({
  entry,
  teamId,
  currentUserId,
}: {
  entry: PoolEntry;
  teamId: string;
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const me = entry.participants.find((p) => p.userId === currentUserId);
  if (!me) return null;

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => toggleMyCompletion(entry.id, teamId))}
      data-glow={me.completed ? "soul" : "gold"}
      className="soul-slot flex w-full items-center gap-2.5 px-3 py-2 text-left disabled:opacity-60"
    >
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
          me.completed ? "border-soul bg-soul/30" : "border-gold"
        }`}
      >
        {me.completed && <Check className="size-3.5 text-soul" />}
      </span>
      <span className="text-sm">
        {me.completed ? (
          <>Masz już zrobione — kliknij, jeśli to pomyłka</>
        ) : (
          <>Kliknij, jeśli już masz zrobione to stworzenie</>
        )}
      </span>
    </button>
  );
}

function LivePaidToggle({
  participant,
  entryId,
  teamId,
  share,
}: {
  participant: Participant;
  entryId: string;
  teamId: string;
  share: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(() =>
          markParticipantPaid(entryId, teamId, participant.userId, !participant.paid)
        )
      }
      data-glow={participant.paid ? "soul" : undefined}
      className="soul-slot flex items-center gap-2 px-2.5 py-1.5 text-xs disabled:opacity-60"
    >
      <span
        className={`flex size-4 shrink-0 items-center justify-center rounded-sm border ${
          participant.paid ? "border-soul bg-soul/30" : "border-gold"
        }`}
      >
        {participant.paid && <Check className="size-3 text-soul" />}
      </span>
      <span>
        <span className="font-medium">{participant.name}</span>
        {" · "}
        <span className={participant.paid ? "text-soul" : "text-gold"}>
          {participant.paid
            ? `zapłacił ${formatGp(share.toFixed(2))} gp`
            : `winien ${formatGp(share.toFixed(2))} gp — kliknij gdy zapłaci`}
        </span>
      </span>
    </button>
  );
}

function ActiveEntry({
  entry,
  teamId,
  members,
  isOrganizer,
  currentUserId,
}: {
  entry: PoolEntry;
  teamId: string;
  members: Member[];
  isOrganizer: boolean;
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();

  const payers = entry.participants.filter(
    (p) => p.userId !== entry.suppliedBy && !p.completed
  );
  const donePayers = entry.participants.filter(
    (p) => p.userId !== entry.suppliedBy && p.completed
  );
  const price = entry.price ? Number(entry.price) : 0;
  const share = payers.length > 0 ? price / payers.length : 0;
  const doneShare = donePayers.length > 0 ? price / donePayers.length : 0;

  return (
    <div className="soul-slot space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/soul-cores/images/${entry.img}`} alt="" className="size-10" />
          <div>
            <p className="font-medium">{entry.creature}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {entry.price && (
                <>
                  <Coins className="size-3 text-gold" />
                  {formatGp(entry.price)} gp ·{" "}
                </>
              )}
              {isOrganizer ? (
                <SupplierSelect entry={entry} teamId={teamId} members={members} />
              ) : (
                `dostarczył ${entry.supplierName}`
              )}
            </div>
          </div>
        </div>
        {isOrganizer && <DeleteButton entryId={entry.id} teamId={teamId} />}
      </div>

      <div className="space-y-2">
        <MyStatusButton entry={entry} teamId={teamId} currentUserId={currentUserId} />

        {entry.participants.filter((p) => p.userId !== currentUserId).length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-1">
            {entry.participants
              .filter((p) => p.userId !== currentUserId)
              .map((p) => {
                const isSupplierMe = entry.suppliedBy === currentUserId;
                const isNonSupplier = p.userId !== entry.suppliedBy;

                if (isSupplierMe && isNonSupplier && p.completed) {
                  return (
                    <LivePaidToggle
                      key={p.userId}
                      participant={p}
                      entryId={entry.id}
                      teamId={teamId}
                      share={doneShare}
                    />
                  );
                }

                return (
                  <span
                    key={p.userId}
                    className="flex items-center gap-1 rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground"
                  >
                    <span
                      className={`size-2 rounded-full ${
                        p.completed ? "bg-soul" : "bg-border"
                      }`}
                    />
                    {p.name}
                    {p.userId === entry.suppliedBy && " (dostawca)"}
                  </span>
                );
              })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">
          {entry.price ? (
            payers.length > 0 ? (
              <>
                obecny podział: <span className="text-gold">{formatGp(share.toFixed(2))} gp</span> ×{" "}
                {payers.length} {payers.length === 1 ? "osoba" : "osób"}
              </>
            ) : (
              "wszyscy zwolnieni z opłaty"
            )
          ) : (
            "brak ustalonej ceny"
          )}
        </p>
        {isOrganizer && (
          <Button
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() =>
              startTransition(() => closeSoulCoreEntry(entry.id, teamId))
            }
          >
            Zamknij wpis
          </Button>
        )}
      </div>
    </div>
  );
}

function ClosedEntry({
  entry,
  teamId,
  currentUserId,
}: {
  entry: PoolEntry;
  teamId: string;
  currentUserId: string;
}) {
  const isSupplierMe = entry.suppliedBy === currentUserId;

  return (
    <div className="soul-slot space-y-3 p-4 opacity-90">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/soul-cores/images/${entry.img}`} alt="" className="size-10" />
        <div className="flex-1">
          <p className="font-medium">{entry.creature}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {entry.price && (
              <>
                <Coins className="size-3 text-gold" />
                {formatGp(entry.price)} gp ·{" "}
              </>
            )}
            dostarczył {entry.supplierName}
          </p>
        </div>
        <Lock className="size-4 text-muted-foreground" />
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {entry.participants.map((p) => (
          <PaidRow
            key={p.userId}
            participant={p}
            entryId={entry.id}
            teamId={teamId}
            canToggle={isSupplierMe && !!p.paidShare}
          />
        ))}
      </div>
    </div>
  );
}

function PaidRow({
  participant,
  entryId,
  teamId,
  canToggle,
}: {
  participant: Participant;
  entryId: string;
  teamId: string;
  canToggle: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (!participant.paidShare) {
    return (
      <div className="flex items-center justify-between rounded-sm bg-muted px-2.5 py-1.5 text-xs">
        <span>{participant.name}</span>
        <span className="text-muted-foreground">bez opłaty</span>
      </div>
    );
  }

  return (
    <button
      disabled={!canToggle || isPending}
      onClick={() =>
        startTransition(() =>
          markParticipantPaid(entryId, teamId, participant.userId, !participant.paid)
        )
      }
      className={`flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-xs ${
        participant.paid ? "bg-soul/15" : "bg-muted"
      } ${canToggle ? "" : "cursor-default"}`}
    >
      {canToggle && (
        <span
          className={`flex size-4 shrink-0 items-center justify-center rounded-sm border ${
            participant.paid ? "border-soul bg-soul/30" : "border-gold"
          }`}
        >
          {participant.paid && <Check className="size-3 text-soul" />}
        </span>
      )}
      <span className="flex-1">
        <span className="font-medium">{participant.name}</span>
        {" · "}
        <span className={participant.paid ? "text-soul" : "text-gold"}>
          {formatGp(participant.paidShare)} gp
          {canToggle
            ? participant.paid
              ? " — oddane, kliknij by cofnąć"
              : " — kliknij gdy zapłaci"
            : participant.paid
              ? " — zapłacone"
              : ""}
        </span>
      </span>
    </button>
  );
}