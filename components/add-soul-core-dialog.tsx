"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { formatGp } from "@/lib/utils";
import { proposeSoulCore } from "@/lib/actions/soul-cores";

type SoulCoreOption = { id: string; creature: string; img: string };

export function AddSoulCoreDialog({
  teamId,
  soulCores,
}: {
  teamId: string;
  soulCores: SoulCoreOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SoulCoreOption | null>(null);
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setSelected(null);
    setPrice("");
    setError(null);
  }

  async function handleSubmit() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      await proposeSoulCore(teamId, selected.id, price);
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger
        render={(props) => <Button {...props}>Dodaj soul core</Button>}
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj soul core do puli</DialogTitle>
        </DialogHeader>

        {!selected ? (
          <Command className="rounded-md border border-border">
            <CommandInput placeholder="Szukaj stworzenia..." />
            <CommandList className="max-h-72">
              <CommandEmpty>Brak wyników.</CommandEmpty>
              <CommandGroup>
                {soulCores.map((sc) => (
                  <CommandItem
                    key={sc.id}
                    value={sc.creature}
                    onSelect={() => setSelected(sc)}
                    className="flex items-center gap-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/soul-cores/images/${sc.img}`}
                      alt=""
                      className="size-6"
                    />
                    {sc.creature}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : (
          <div className="space-y-3">
            <div className="soul-slot flex items-center gap-3 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/soul-cores/images/${selected.img}`}
                alt=""
                className="size-8"
              />
              <span className="font-medium">{selected.creature}</span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="ml-auto text-sm text-muted-foreground hover:text-foreground"
              >
                Zmień
              </button>
            </div>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Cena (gp)"
              value={formatGp(price)}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Dodawanie..." : "Dodaj do puli"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}