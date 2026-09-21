import { cn, getPokemonSpriteUrl } from "~/lib/utils";
import { ShinyAura } from "./ShinyAura";

interface ParticipantAvatarProps {
  unitNumber: number;
  unitLvl: number;
  current?: boolean;
  withUnitNumber?: boolean;
  shiny?: boolean;
}
export const UnitAvatar = ({
  unitNumber,
  unitLvl,
  current,
  withUnitNumber,
  shiny,
}: ParticipantAvatarProps) => (
  <div className="size-16 sm:size-20 relative transition-all">
    {shiny && <ShinyAura />}
    <img
      src={getPokemonSpriteUrl(unitNumber, shiny)}
      className={cn(
        "rounded-full border p-1 bg-card",
        current && "border-primary/60",
        shiny && "border-yellow-300/70",
      )}
    />
    {withUnitNumber && (
      <span
        className={cn(
          "text-xs text-foreground/80 border px-1 absolute right-0 top-0 rounded-sm bg-card z-20",
          current && "border-primary/60",
          shiny && "border-yellow-300/70",
        )}
      >
        #{unitNumber}
      </span>
    )}
    <span
      className={cn(
        "text-xs text-foreground/80 border px-1 absolute bottom-0 right-0 rounded-sm bg-card z-20",
        current && "border-primary/60",
        shiny && "border-yellow-300/70",
      )}
    >
      Niv. {unitLvl}
    </span>
  </div>
);
