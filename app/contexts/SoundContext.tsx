import * as React from "react";

interface SoundContextValue {
  soundEnabled: boolean;
  toggleSound: () => void;
}

const SoundContext = React.createContext<SoundContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = "sound-enabled";

export const SoundProvider = ({ children }: { children: React.ReactNode }) => {
  const [soundEnabled, setSoundEnabled] = React.useState(true);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setSoundEnabled(stored === "true");
  }, []);

  const toggleSound = React.useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <SoundContext.Provider value={{ soundEnabled, toggleSound }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => {
  const ctx = React.useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used within a SoundProvider");
  return ctx;
};
