import { useEffect, useRef, useState } from "react";
import { Waves, CloudRain, Music2, Volume2 } from "lucide-react";
import { usePremium } from "@/lib/premium";
import { PremiumBadge } from "./PremiumBadge";
import { cn } from "@/lib/utils";

type SoundId = "lofi" | "rain" | "white";

const SOUNDS: {
  id: SoundId;
  label: string;
  icon: typeof Waves;
  /** noise color + lowpass cutoff for the generated texture */
  brown: boolean;
  cutoff: number;
}[] = [
  { id: "lofi", label: "Lo-Fi Warmth", icon: Music2, brown: true, cutoff: 480 },
  { id: "rain", label: "Rainy Day", icon: CloudRain, brown: false, cutoff: 1400 },
  { id: "white", label: "White Noise", icon: Waves, brown: false, cutoff: 16000 },
];

export function AmbientSounds() {
  const { hasTier, openPaywall } = usePremium();
  const isUnlocked = hasTier("ultra");
  const [active, setActive] = useState<SoundId | null>(null);
  const [volume, setVolume] = useState(0.4);

  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);

  const stop = () => {
    srcRef.current?.stop();
    srcRef.current?.disconnect();
    srcRef.current = null;
    setActive(null);
  };

  const play = (id: SoundId) => {
    const def = SOUNDS.find((s) => s.id === id)!;
    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      ctxRef.current = ctx;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      gain.connect(ctx.destination);
      gainRef.current = gain;
    }
    void ctx.resume();
    srcRef.current?.stop();

    const seconds = 3;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const out = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < out.length; i++) {
      const white = Math.random() * 2 - 1;
      if (def.brown) {
        last = (last + 0.02 * white) / 1.02;
        out[i] = last * 3.5;
      } else {
        out[i] = white;
      }
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = def.cutoff;

    src.connect(filter);
    filter.connect(gainRef.current!);
    src.start();
    srcRef.current = src;
    setActive(id);
  };

  useEffect(() => {
    if (gainRef.current && ctxRef.current) {
      gainRef.current.gain.setTargetAtTime(
        volume,
        ctxRef.current.currentTime,
        0.05,
      );
    }
  }, [volume]);

  useEffect(() => () => stop(), []);

  const toggle = (id: SoundId) => {
    if (!isUnlocked) {
      openPaywall("Ambient Soundscapes", "ultra");
      return;
    }
    if (active === id) stop();
    else play(id);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          Focus Soundscapes
        </h3>
        <PremiumBadge />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {SOUNDS.map((s) => {
          const on = active === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] font-semibold transition-all duration-300",
                on
                  ? "border-primary bg-primary/15 text-primary-glow glow-soft"
                  : "border-border bg-background/30 text-muted-foreground hover:border-primary/40",
              )}
            >
              <s.icon className={cn("h-4 w-4", on && "animate-pulse")} />
              {s.label}
            </button>
          );
        })}
      </div>
      {isUnlocked && active && (
        <div className="mt-3 flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Soundscape volume"
            className="h-1 flex-1 cursor-pointer accent-primary"
          />
        </div>
      )}
    </div>
  );
}
