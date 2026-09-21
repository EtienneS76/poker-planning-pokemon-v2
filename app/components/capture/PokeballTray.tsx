import * as React from "react";
import { motion } from "motion/react";
import { cn } from "~/lib/utils";

export interface CaptureDropTarget {
  userId: string;
  unitId: string;
  number: number;
  lvl: number;
  shiny: boolean;
}

interface PokeballTrayProps {
  count: number;
  maxCount: number;
  nextTickAt?: number | null;
  disabled?: boolean;
  onDropOnTarget: (target: CaptureDropTarget) => void;
}

const formatRemaining = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const PokeballTimer = ({ nextTickAt }: { nextTickAt?: number | null }) => {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!nextTickAt) {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        Stock de Pokéballs au maximum
      </span>
    );
  }

  return (
    <span className="text-xs font-medium text-muted-foreground tabular-nums">
      Prochaine Pokéball dans {formatRemaining(nextTickAt - now)}
    </span>
  );
};

/**
 * Affiche le stock de pokéballs du joueur et permet d'en faire glisser une
 * sur l'avatar d'un autre participant (élément portant `data-capture-target`)
 * pour tenter une capture. Implémenté avec des pointer events natifs (pas de
 * lib dnd) pour un contrôle fin de l'animation du ballon en cours de vol.
 */
export const PokeballTray = ({
  count,
  maxCount,
  nextTickAt,
  disabled,
  onDropOnTarget,
}: PokeballTrayProps) => {
  const [dragPos, setDragPos] = React.useState<{ x: number; y: number } | null>(
    null,
  );
  const [hoveredTarget, setHoveredTarget] = React.useState<string | null>(
    null,
  );
  const draggingRef = React.useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || count <= 0) return;
    e.preventDefault();
    draggingRef.current = true;
    setDragPos({ x: e.clientX, y: e.clientY });

    const handleMove = (ev: PointerEvent) => {
      setDragPos({ x: ev.clientX, y: ev.clientY });
      const el = document
        .elementFromPoint(ev.clientX, ev.clientY)
        ?.closest("[data-capture-target]") as HTMLElement | null;
      setHoveredTarget(el?.dataset.captureTarget ?? null);
    };

    const handleUp = (ev: PointerEvent) => {
      draggingRef.current = false;
      const el = document
        .elementFromPoint(ev.clientX, ev.clientY)
        ?.closest("[data-capture-target]") as HTMLElement | null;
      setDragPos(null);
      setHoveredTarget(null);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      if (el?.dataset.captureTarget) {
        onDropOnTarget({
          userId: el.dataset.captureTarget,
          unitId: el.dataset.captureUnitId ?? "",
          number: Number(el.dataset.captureNumber ?? 0),
          lvl: Number(el.dataset.captureLvl ?? 0),
          shiny: el.dataset.captureShiny === "true",
        });
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <>
      <div className="flex flex-col items-center gap-1">
        <div className="flex gap-1">
          {Array.from({ length: maxCount }).map((_, i) => (
            <img
              key={i}
              src="/pokeball.png"
              onPointerDown={i < count ? handlePointerDown : undefined}
              className={cn(
                "size-8 sm:size-9 transition-all select-none",
                i < count
                  ? "cursor-grab active:cursor-grabbing drop-shadow-md hover:scale-110"
                  : "opacity-20 grayscale",
              )}
              draggable={false}
            />
          ))}
        </div>
        <PokeballTimer nextTickAt={nextTickAt} />
        <span className="text-xs text-muted-foreground">
          {count > 0
            ? "Glisse une Pokéball sur un joueur pour tenter une capture"
            : "Aucune Pokéball disponible"}
        </span>
      </div>

      {dragPos && (
        <motion.img
          src="/pokeball.png"
          className={cn(
            "pointer-events-none fixed z-[150] size-10 -translate-x-1/2 -translate-y-1/2 drop-shadow-xl",
            hoveredTarget && "scale-125",
          )}
          style={{ left: dragPos.x, top: dragPos.y }}
          animate={{ rotate: hoveredTarget ? 0 : 360 }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
        />
      )}
    </>
  );
};
