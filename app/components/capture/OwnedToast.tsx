import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "~/lib/utils";

export interface OwnedToastHandle {
  show: (message: string) => void;
}

/**
 * Petite notification en bas à gauche de l'écran, utilisée pour prévenir
 * l'utilisateur que le Pokémon visé est déjà dans son Pokédex.
 */
export const OwnedToast = React.forwardRef<OwnedToastHandle>((_props, ref) => {
  const [messages, setMessages] = React.useState<
    { id: number; text: string }[]
  >([]);
  const nextId = React.useRef(0);

  React.useImperativeHandle(ref, () => ({
    show: (message: string) => {
      const id = nextId.current++;
      setMessages((prev) => [...prev, { id, text: message }]);
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }, 3000);
    },
  }));

  return (
    <div className="fixed bottom-4 left-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, x: -40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={cn(
              "bg-card border border-border shadow-lg rounded-lg px-4 py-3 flex items-center gap-2 max-w-xs",
            )}
          >
            <img src="/pokeball.png" className="size-6 shrink-0" />
            <span className="text-sm font-medium">{m.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});
OwnedToast.displayName = "OwnedToast";
