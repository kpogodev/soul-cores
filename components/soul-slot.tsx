import { cn } from "@/lib/utils";

type SoulSlotProps = {
  glow?: "idle" | "soul" | "gold";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
};

const sizeClasses: Record<NonNullable<SoulSlotProps["size"]>, string> = {
  sm: "size-10",
  md: "size-16",
  lg: "size-24",
};

export function SoulSlot({
  glow = "idle",
  size = "md",
  className,
  children,
}: SoulSlotProps) {
  return (
    <div
      className={cn(
        "soul-slot flex items-center justify-center",
        sizeClasses[size],
        className
      )}
      data-glow={glow === "idle" ? undefined : glow}
    >
      {children}
    </div>
  );
}