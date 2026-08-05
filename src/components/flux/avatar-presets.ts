import {
  Rocket,
  Ghost,
  Cat,
  Zap,
  Moon,
  Leaf,
  Flame,
  Gem,
  Orbit,
  Waves,
  type LucideIcon,
} from "lucide-react";

export const PRESET_PREFIX = "preset:";

export interface AvatarPreset {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Tailwind gradient classes for the circle background. */
  gradient: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "rocket", label: "Rocket", icon: Rocket, gradient: "from-primary to-primary-glow" },
  { id: "orbit", label: "Orbit", icon: Orbit, gradient: "from-indigo-500 to-primary" },
  { id: "zap", label: "Voltage", icon: Zap, gradient: "from-violet-500 to-fuchsia-400" },
  { id: "moon", label: "Midnight", icon: Moon, gradient: "from-slate-600 to-indigo-400" },
  { id: "gem", label: "Gem", icon: Gem, gradient: "from-purple-500 to-sky-400" },
  { id: "flame", label: "Flame", icon: Flame, gradient: "from-rose-500 to-amber-400" },
  { id: "leaf", label: "Leaf", icon: Leaf, gradient: "from-emerald-500 to-lime-400" },
  { id: "waves", label: "Waves", icon: Waves, gradient: "from-cyan-500 to-primary" },
  { id: "cat", label: "Cat", icon: Cat, gradient: "from-amber-500 to-rose-400" },
  { id: "ghost", label: "Ghost", icon: Ghost, gradient: "from-slate-500 to-primary" },
];

export function presetFor(value?: string | null): AvatarPreset | undefined {
  if (!value || !value.startsWith(PRESET_PREFIX)) return undefined;
  const id = value.slice(PRESET_PREFIX.length);
  return AVATAR_PRESETS.find((p) => p.id === id);
}
