import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Check, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useFlux } from "@/lib/flux-store";
import { Avatar } from "./Avatar";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ACCEPT = "image/png, image/jpeg, image/webp";

export function ProfileEditor() {
  const { user } = useAuth();
  const { reload } = useFlux();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  // Turn the stored storage path into a viewable signed URL.
  useEffect(() => {
    if (!avatarUrl) {
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
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        full_name: fullName.trim() || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save profile.");
      return;
    }
    setSavedAt(Date.now());
    reload();
  };

  const onUpload = async (file: File) => {
    if (!user) return;
    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 2 MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      toast.error("Upload failed.");
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
    reload();
    toast.success("Profile photo updated.");
  };

  const initialsName = displayName || fullName || user?.email;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
      <p className="flex items-center gap-1.5 text-sm font-bold text-primary">
        <UserIcon className="h-4 w-4" /> Your Profile
      </p>

      <div className="mt-3 flex items-center gap-3">
        <div className="relative">
          <Avatar
            name={initialsName}
            email={user?.email}
            url={signedUrl}
            size="xl"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Change profile photo"
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
          <p className="truncate text-sm font-semibold">
            {displayName || fullName || "Add your name"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <label className="mt-4 block text-xs text-muted-foreground">
        Display name
      </label>
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
        placeholder="How teammates see you"
        className="mt-1 w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
      />

      <label className="mt-3 block text-xs text-muted-foreground">
        Full name
      </label>
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value.slice(0, 80))}
        placeholder="Full name"
        className="mt-1 w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
      />

      <button
        onClick={save}
        disabled={saving}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
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
  );
}
