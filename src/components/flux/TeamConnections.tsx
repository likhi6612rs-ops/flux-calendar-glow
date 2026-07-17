import { useEffect, useState } from "react";
import {
  Users,
  Copy,
  Check,
  UserPlus,
  Eye,
  EyeOff,
  Loader2,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { ShareAccessModal } from "./ShareAccessModal";
import type { ProfileLite } from "@/lib/flux-store";

export function TeamConnections() {
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showTasks, setShowTasks] = useState(true);
  const [connections, setConnections] = useState<ProfileLite[]>([]);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [configuring, setConfiguring] = useState<ProfileLite | null>(null);

  const load = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("invite_code, privacy_show_tasks")
      .eq("id", user.id)
      .maybeSingle();
    if (profile) {
      setInviteCode(profile.invite_code);
      setShowTasks(profile.privacy_show_tasks);
    }

    const { data: rows } = await supabase
      .from("connections")
      .select("requester_id, connected_user_id")
      .or(`requester_id.eq.${user.id},connected_user_id.eq.${user.id}`);
    const otherIds = (rows ?? [])
      .map((r) =>
        r.requester_id === user.id ? r.connected_user_id : r.requester_id,
      )
      .filter((id, i, a) => a.indexOf(id) === i);
    if (otherIds.length === 0) {
      setConnections([]);
      return;
    }
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, full_name, email, avatar_url")
      .in("id", otherIds);
    setConnections((profs ?? []) as ProfileLite[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const copyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy code.");
    }
  };

  const joinTeam = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6 || !user) return;
    setJoining(true);
    const { error } = await supabase.rpc("join_by_invite_code", { _code: code });
    setJoining(false);
    if (error) {
      toast.error(error.message || "Couldn't connect. Check the code.");
      return;
    }
    toast.success("Connected! You've joined their team.");
    setJoinCode("");
    load();
  };

  const togglePrivacy = async () => {
    if (!user) return;
    const next = !showTasks;
    setShowTasks(next);
    setSavingPrivacy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ privacy_show_tasks: next })
      .eq("id", user.id);
    setSavingPrivacy(false);
    if (error) {
      setShowTasks(!next);
      toast.error("Couldn't update privacy.");
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
      <p className="flex items-center justify-between gap-1.5 text-sm font-bold text-primary">
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4" /> Team &amp; Connections
        </span>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px]">
          {connections.length} connected
        </span>
      </p>

      {/* Invite code */}
      <div className="mt-3">
        <p className="mb-1 text-xs text-muted-foreground">Your invite code</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 font-mono text-lg font-bold tracking-[0.25em]">
            {inviteCode ?? "······"}
          </div>
          <button
            onClick={copyCode}
            disabled={!inviteCode}
            aria-label="Copy invite code"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform active:scale-95 disabled:opacity-50"
          >
            {copied ? (
              <Check className="h-4 w-4" strokeWidth={3} />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Join a team */}
      <div className="mt-4">
        <p className="mb-1 text-xs text-muted-foreground">
          Join a team — enter a friend's code
        </p>
        <div className="flex items-center gap-2">
          <input
            value={joinCode}
            onChange={(e) =>
              setJoinCode(
                e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6),
              )
            }
            onKeyDown={(e) => e.key === "Enter" && joinTeam()}
            placeholder="ABC123"
            maxLength={6}
            aria-label="Enter invite code to join"
            className="flex-1 rounded-lg border border-input bg-background/60 px-3 py-2 font-mono text-base uppercase tracking-[0.2em] outline-none transition-colors placeholder:tracking-normal placeholder:text-muted-foreground/60 focus:border-primary"
          />
          <button
            onClick={joinTeam}
            disabled={joining || joinCode.trim().length !== 6}
            aria-label="Join team"
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-95 disabled:opacity-50"
          >
            {joining ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Join
          </button>
        </div>
      </div>

      {/* Connection list */}
      {connections.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs text-muted-foreground">Your team</p>
          <ul className="space-y-1.5">
            {connections.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-2.5 py-2"
              >
                <Avatar
                  name={c.display_name || c.full_name}
                  email={c.email}
                  url={null}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {c.display_name || c.full_name || c.email}
                  </p>
                  {(c.display_name || c.full_name) && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {c.email}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setConfiguring(c)}
                  className="flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20"
                  aria-label={`Configure access for ${c.display_name || c.email}`}
                >
                  <Settings2 className="h-3 w-3" /> Access
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Privacy toggle */}
      <button
        onClick={togglePrivacy}
        disabled={savingPrivacy}
        className={cn(
          "mt-4 flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
          showTasks
            ? "border-primary/50 bg-primary/10"
            : "border-border bg-background/40",
        )}
      >
        <span className="flex items-center gap-2">
          {showTasks ? (
            <Eye className="h-4 w-4 text-primary" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span>
            <span className="block text-sm font-semibold">
              Share tasks with connections
            </span>
            <span className="block text-xs text-muted-foreground">
              {showTasks
                ? "Use Access above to pick which tasks each teammate sees"
                : "Sharing paused — no one can see your tasks"}
            </span>
          </span>
        </span>
        <span
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            showTasks ? "bg-primary" : "bg-secondary",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
              showTasks ? "translate-x-[22px]" : "translate-x-0.5",
            )}
          />
        </span>
      </button>

      {configuring && (
        <ShareAccessModal
          connector={configuring}
          onClose={() => setConfiguring(null)}
        />
      )}
    </div>
  );
}
