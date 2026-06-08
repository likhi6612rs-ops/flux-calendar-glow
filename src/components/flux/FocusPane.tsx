import { FocusTimer } from "./FocusTimer";
import { AmbientSounds } from "./AmbientSounds";

export function FocusPane() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">Focus</h2>
        <p className="text-xs text-muted-foreground">
          Deep-work timer and ambient soundscapes.
        </p>
      </div>
      <FocusTimer />
      <AmbientSounds />
    </div>
  );
}
