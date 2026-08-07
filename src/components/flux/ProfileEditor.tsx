import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Check, BadgeCheck, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePremium, tierLabel } from "@/lib/premium";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { AVATAR_PRESETS, PRESET_PREFIX, presetFor } from "./avatar-presets";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
// Broad accept so mobile shows Camera + Gallery; validated again on select.
const ACCEPT = "image/*";
const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/heic", "image/heif"];

export function ProfileEditor() {
  const { user } = useAuth();
  const { tier, openPaywall, refreshProfile } = usePremium();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const verified = !!user?.email_confirmed_at;
  const isPaid = tier !== "free";

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, username, full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as {
          display_name?: string | null;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
        } | null;
        setDisplayName(row?.display_name ?? "");
        setUsername(row?.username ?? "");
        setFullName(row?.full_name ?? "");
        setAvatarUrl(row?.avatar_url ?? null);
      });
  }, [user]);

  // Turn a stored storage path into a viewable signed URL (presets skip this).
  useEffect(() => {
    if (!avatarUrl || avatarUrl.startsWith(PRESET_PREFIX)) {
      setSignedUrl(null);
      return;
    }
    let cancelled = false;
    supabase.storage
      .from("avatars")
      .createSignedUrl(avatarUrl, 60 * 60)
      .then(({ data }) => {
        if (!cancelled) setSignedUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [avatarUrl]);

  const save = async () => {
    if (!user) return;
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (cleanUsername && cleanUsername.length < 3) {
      toast.error("Username must be at least 3 characters.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        username: cleanUsername || null,
        full_name: fullName.trim() || null,
      } as never)
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(
        error.message.includes("duplicate")
          ? "That username is already taken."
          : "Couldn't save profile.",
      );
      return;
    }
    setUsername(cleanUsername);
    setSavedAt(Date.now());
    refreshProfile();
  };

  const setPreset = async (id: string) => {
    if (!user) return;
    const value = `${PRESET_PREFIX}${id}`;
    setLocalPreview(null);
    setAvatarUrl(value);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: value })
      .eq("id", user.id);
    if (error) toast.error("Couldn't set that avatar.");
  };

  const onUpload = async (file: File) => {
    if (!user) return;

    const type = (file.type || "").toLowerCase();
    const extGuess = file.name.split(".").pop()?.toLowerCase() || "";
    const looksImage =
      type.startsWith("image/") ||
      ["png", "jpg", "jpeg", "webp", "gif", "heic", "heif"].includes(extGuess);
    if (!looksImage || (type && !ALLOWED.includes(type) && !type.startsWith("image/"))) {
      toast.error("Unsupported file. Pick a PNG, JPG, WEBP or HEIC image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 5 MB.");
      return;
    }

    // Instant optimistic preview from device storage.
    const preview = URL.createObjectURL(file);
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return preview;
    });

    setUploading(true);
    const ext = extGuess || (type.split("/")[1] ?? "png");
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, {
        upsert: true,
        contentType: type || "image/png",
        cacheControl: "3600",
      });
    if (upErr) {
      setUploading(false);
      setLocalPreview(null);
      URL.revokeObjectURL(preview);
      toast.error(
        upErr.message?.toLowerCase().includes("policy")
          ? "You don't have permission to upload right now."
          : "Upload failed. Check your connection and try again.",
      );
      return;
    }
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", user.id);
    setUploading(false);
    if (dbErr) {
      toast.error("Couldn't attach image.");
      return;
    }
    setAvatarUrl(path);
    refreshProfile();
    toast.success("Profile photo updated.");
  };

  // Clean up the last object URL when the editor unmounts.
  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const initialsName = displayName || fullName || user?.email;
  const activePreset = presetFor(avatarUrl);

  return (
    <section className="space-y-6">
      {/* Identity card */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.09] to-transparent p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar
              name={initialsName}
              email={user?.email}
              url={localPreview ?? (activePreset ? avatarUrl : signedUrl)}
              size="xl"
            />

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Upload profile photo"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-md transition-transform active:scale-95 disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = "";
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold tracking-tight">
              {displayName || fullName || "Add your name"}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <span className="truncate">{user?.email}</span>
              {verified && (
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
              )}
            </p>
            <span
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                isPaid
                  ? "bg-primary/15 text-primary"
                  : "bg-muted-foreground/10 text-muted-foreground",
              )}
            >
              <Crown className="h-3 w-3" /> {tierLabel(tier)}
            </span>
          </div>
        </div>

        {!isPaid && (
          <button
            onClick={() => openPaywall("Flux Premium", "premium")}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" /> Go Premium
          </button>
        )}
      </div>

      {/* Avatar presets */}
      <div className="rounded-2xl border border-border bg-card/40 p-5">
        <h2 className="text-sm font-bold">Choose an avatar</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick a sleek icon, or upload your own photo with the camera button.
        </p>
        <div className="mt-4 grid grid-cols-5 gap-3 sm:grid-cols-10">
          {AVATAR_PRESETS.map((p) => {
            const Icon = p.icon;
            const active = activePreset?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                aria-label={p.label}
                aria-pressed={active}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-full bg-gradient-to-br text-primary-foreground transition-all duration-200 active:scale-95",
                  p.gradient,
                  active
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "opacity-80 hover:opacity-100",
                )}
              >
                <Icon className="h-1/2 w-1/2" strokeWidth={2.2} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Details */}
      <div className="rounded-2xl border border-border bg-card/40 p-5">
        <h2 className="text-sm font-bold">Account details</h2>

        <label className="mt-4 block text-xs text-muted-foreground">
          Display name
        </label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
          placeholder="How teammates see you"
          className="mt-1 w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
        />

        <label className="mt-4 block text-xs text-muted-foreground">Username</label>
        <div className="mt-1 flex items-center gap-2 rounded-xl border border-input bg-background/60 px-3 py-2.5 transition-colors focus-within:border-primary">
          <span className="text-sm text-muted-foreground">@</span>
          <input
            value={username}
            onChange={(e) =>
              setUsername(
                e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24),
              )
            }
            placeholder="your_handle"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        <label className="mt-4 block text-xs text-muted-foreground">Full name</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value.slice(0, 80))}
          placeholder="Full name"
          className="mt-1 w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
        />

        <label className="mt-4 block text-xs text-muted-foreground">Email</label>
        <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-border bg-background/30 px-3 py-2.5">
          <span className="truncate text-sm text-muted-foreground">
            {user?.email}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              verified
                ? "bg-primary/15 text-primary"
                : "bg-amber-300/15 text-amber-300",
            )}
          >
            {verified ? "Verified" : "Unverified"}
          </span>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : savedAt && Date.now() - savedAt < 2500 ? (
            <>
              <Check className="h-4 w-4" strokeWidth={3} /> Saved
            </>
          ) : (
            "Save profile"
          )}
        </button>
      </div>
    </section>
  );
}
