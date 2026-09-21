import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn, getPokemonSpriteUrl } from "~/lib/utils";

export type CaptureResult = "success" | "failure";

interface CaptureModalProps {
  open: boolean;
  pokemonNumber: number;
  shiny: boolean;
  chance: number;
  result: CaptureResult | null;
  onClose: () => void;
  soundEnabled: boolean;
}

const SIZE = 260;
const CENTER = SIZE / 2;
const RADIUS = 100;
const STROKE = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SPIN_DURATION = 3.6; // secondes
const FULL_TURNS = 5;

// Graduations décoratives, à l'intérieur de l'anneau.
const TICK_OUTER_Y = CENTER - RADIUS + STROKE / 2 + 6;
const TICK_INNER_Y = TICK_OUTER_Y + 10;
// Aiguille posée sur les graduations, pointe dirigée vers l'anneau.
const NEEDLE_TIP_Y = TICK_OUTER_Y - 2;
const NEEDLE_BASE_Y = NEEDLE_TIP_Y + 18;

const playSfx = (
  type: OscillatorType,
  frequency: number,
  duration: number,
  volume = 0.2,
) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
    oscillator.onended = () => ctx.close();
  } catch (e) {
    console.log("Impossible de jouer le son :", e);
  }
};

const randomBetween = (min: number, max: number) =>
  min + Math.random() * (max - min);

/**
 * Modale de capture façon "roue de la fortune" : une zone verte représente le
 * pourcentage de réussite, une aiguille tourne et s'arrête dans la zone verte
 * en cas de capture réussie, dans la zone rouge en cas d'échec.
 */
export const CaptureModal = ({
  open,
  pokemonNumber,
  shiny,
  chance,
  result,
  onClose,
  soundEnabled,
}: CaptureModalProps) => {
  const [phase, setPhase] = React.useState<"waiting" | "spinning" | "revealed">(
    "waiting",
  );
  const [targetRotation, setTargetRotation] = React.useState(0);
  // Évite de relancer la roue sur les re-rendus intermédiaires.
  const spinStartedRef = React.useRef(false);

  React.useEffect(() => {
    if (!open) {
      setPhase("waiting");
      setTargetRotation(0);
      spinStartedRef.current = false;
    }
  }, [open]);

  // Dès que le serveur a rendu son verdict, on lance la roue vers un angle
  // cohérent avec le résultat.
  React.useEffect(() => {
    if (!open || !result || spinStartedRef.current) return;
    spinStartedRef.current = true;

    const greenAngle = (chance / 100) * 360;
    // Marge pour que l'aiguille ne s'arrête jamais pile sur une frontière.
    const margin = 4;
    const landing =
      result === "success"
        ? randomBetween(margin, Math.max(margin + 1, greenAngle - margin))
        : randomBetween(
            greenAngle + margin,
            Math.max(greenAngle + margin + 1, 360 - margin),
          );

    setTargetRotation(FULL_TURNS * 360 + landing);
    setPhase("spinning");

    if (soundEnabled) playSfx("square", 520, 0.08, 0.12);

    const timer = setTimeout(() => {
      setPhase("revealed");
      if (soundEnabled) {
        if (result === "success") {
          playSfx("triangle", 660, 0.18);
          setTimeout(() => playSfx("triangle", 880, 0.35), 160);
        } else {
          playSfx("sawtooth", 200, 0.45);
        }
      }
    }, SPIN_DURATION * 1000);

    return () => clearTimeout(timer);
  }, [open, result, chance, soundEnabled]);

  const greenLength = (CIRCUMFERENCE * chance) / 100;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative flex flex-col items-center gap-5 rounded-2xl border-2 border-primary bg-card px-8 py-7 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-card-foreground">
              Tentative de capture
            </h2>

            <div className="relative" style={{ width: SIZE, height: SIZE }}>
              <svg width={SIZE} height={SIZE}>
                {/* Graduations décoratives */}
                {Array.from({ length: 48 }).map((_, i) => (
                  <line
                    key={i}
                    x1={CENTER}
                    y1={TICK_OUTER_Y}
                    x2={CENTER}
                    y2={TICK_INNER_Y}
                    stroke="currentColor"
                    className="text-muted-foreground/30"
                    strokeWidth={2}
                    strokeLinecap="round"
                    transform={`rotate(${(i / 48) * 360} ${CENTER} ${CENTER})`}
                  />
                ))}

                {/* Zone d'échec (fond de la roue) */}
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke="currentColor"
                  className="text-red-500/25"
                  strokeWidth={STROKE}
                />

                {/* Zone de réussite */}
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke="currentColor"
                  className="text-emerald-500"
                  strokeWidth={STROKE}
                  strokeLinecap="butt"
                  strokeDasharray={`${greenLength} ${CIRCUMFERENCE - greenLength}`}
                  transform={`rotate(-90 ${CENTER} ${CENTER})`}
                />

                {/* Aiguille */}
                <motion.g
                  initial={{ rotate: 0 }}
                  animate={{ rotate: targetRotation }}
                  transition={{
                    duration: SPIN_DURATION,
                    ease: [0.15, 0.85, 0.25, 1],
                  }}
                  style={{
                    // `view-box` est indispensable : par défaut Motion applique
                    // `fill-box`, ce qui ferait pivoter l'aiguille autour
                    // d'elle-même au lieu du centre de la roue.
                    transformBox: "view-box",
                    transformOrigin: `${CENTER}px ${CENTER}px`,
                  }}
                >
                  <polygon
                    points={`${CENTER},${NEEDLE_TIP_Y} ${CENTER - 9},${NEEDLE_BASE_Y} ${CENTER + 9},${NEEDLE_BASE_Y}`}
                    fill="currentColor"
                    className="text-card-foreground drop-shadow"
                    strokeLinejoin="round"
                  />
                </motion.g>
              </svg>

              {/* Pokémon au centre de la roue */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.img
                  src={getPokemonSpriteUrl(pokemonNumber, shiny)}
                  className={cn(
                    "size-24 transition-all duration-300",
                    phase !== "revealed" && "drop-shadow-lg",
                    phase === "revealed" &&
                      result === "failure" &&
                      "opacity-40 grayscale",
                  )}
                  animate={
                    phase === "spinning"
                      ? { y: [0, -6, 0] }
                      : phase === "revealed" && result === "success"
                        ? { scale: [1, 1.25, 1] }
                        : phase === "revealed" && result === "failure"
                          ? { x: [0, -12, 12, -8, 8, 0] }
                          : {}
                  }
                  transition={
                    phase === "spinning"
                      ? { duration: 0.9, repeat: Infinity }
                      : { duration: 0.5 }
                  }
                />
              </div>
            </div>

            {/* Pourcentage de chance */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-3xl font-extrabold text-emerald-500 tabular-nums">
                {result === null ? "—" : `${chance.toFixed(2)}%`}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                de chance de capture
              </span>
            </div>

            {phase === "revealed" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <span
                  className={cn(
                    "text-base font-bold uppercase tracking-wide",
                    result === "success"
                      ? "text-emerald-500"
                      : "text-red-500",
                  )}
                >
                  {result === "success" ? "Réussite" : "Échec"}
                </span>
                <button
                  onClick={onClose}
                  className="rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
                >
                  {result === "success"
                    ? "Ajouté au Pokédex !"
                    : "Il s'est échappé..."}
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
