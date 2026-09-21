import { motion } from "motion/react";

const SPARKLES = [
  { x: "-10%", y: "4%", size: 16, delay: 0 },
  { x: "88%", y: "-6%", size: 13, delay: 0.5 },
  { x: "96%", y: "62%", size: 14, delay: 1 },
  { x: "-4%", y: "84%", size: 11, delay: 1.5 },
];

/** Halo doré animé affiché autour d'un Pokémon shiny. */
export const ShinyAura = () => (
  <span className="pointer-events-none absolute inset-0 z-10">
    <motion.span
      className="absolute inset-0 rounded-full"
      style={{
        boxShadow:
          "0 0 10px 2px rgba(250, 204, 21, 0.55), inset 0 0 8px rgba(253, 224, 71, 0.5)",
      }}
      animate={{ opacity: [0.45, 1, 0.45] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.span
      className="absolute inset-0 rounded-full"
      style={{
        background:
          "conic-gradient(from 0deg, transparent 0deg, rgba(253, 224, 71, 0.85) 40deg, transparent 90deg, transparent 360deg)",
        maskImage:
          "radial-gradient(circle, transparent 66%, black 70%, black 100%)",
        WebkitMaskImage:
          "radial-gradient(circle, transparent 66%, black 70%, black 100%)",
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
    />
    {SPARKLES.map((sparkle) => (
      <motion.span
        key={`${sparkle.x}-${sparkle.y}`}
        className="absolute"
        style={{ left: sparkle.x, top: sparkle.y }}
        animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.4] }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          delay: sparkle.delay,
          ease: "easeInOut",
        }}
      >
        <svg
          width={sparkle.size}
          height={sparkle.size}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 0c.6 7 4.4 10.8 12 12-7.6 1.2-11.4 5-12 12-.6-7-4.4-10.8-12-12C7.6 10.8 11.4 7 12 0Z"
            fill="#fde047"
          />
        </svg>
      </motion.span>
    ))}
  </span>
);
