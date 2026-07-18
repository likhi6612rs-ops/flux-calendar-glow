import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Copy,
  Check,
  UserPlus,
  Eye,
  EyeOff,
  Loader2,
  Settings2,
  LogOut,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { DelegationWizard } from "./DelegationWizard";
import type { ProfileLite } from "@/lib/flux-store";

const MAX_CONNECTORS = 5;

interface IncomingContract {
  owner: ProfileLite;
  startDate: string;
  endDate: string;
  taskCount: number;
}

export function TeamConnections() {
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showTasks, setShowTasks] = useState(true);
  const [connections, setConnections] = useState<ProfileLite[]>([]);
  const [incoming, setIncoming] = useState<IncomingContract[]>([]);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [delegating, setDelegating] = useState<ProfileLite | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const load = useCallback(async () => {
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

    // My outgoing connections (I invited).
    const { data: rows } = await supabase
      .from("connections")
      .select("requester_id, connected_user_id")
      .eq("requester_id", user.id);
    const otherIds = (rows ?? []).map((r) => r.connected_user_id);
    if (otherIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, full_name, email, avatar_url")
        .in("id", otherIds);
      setConnections((profs ?? []) as ProfileLite[]);
    } else {
      setConnections([]);
    }

    // Contracts assigned TO me (I am the connector).
    const { data: contracts } = await supabase
      .from("active_contracts")
      .select("owner_id, task_id, start_date, end_date")
      .eq("connector_id", user.id);
    if (contracts && contracts.length > 0) {
      const ownerIds = [...new Set(contracts.map((c) => c.owner_id))];
      const { data: owners } = await supabase
        .from("profiles")
        .select("id, display_name, full_name, email, avatar_url")
        .in("id", ownerIds);
      const oMap = new Map<string, ProfileLite>(
        (owners ?? []).map((o) => [o.id, o as ProfileLite]),
      );
      const grouped = new Map<string, IncomingContract>();
      contracts.forEach((c) => {
        const key = c.owner_id;
        const owner = oMap.get(key);
        if (!owner) return;
        const existing = grouped.get(key);
        if (!existing) {
          grouped.set(key, {
            owner,
            startDate: c.start_date,
            endDate: c.end_date,
            taskCount: 1,
          });
        } else {
          existing.taskCount += 1;
          if (c.start_date < existing.startDate) existing.startDate = c.start_date;
          if (c.end_date > existing.endDate) existing.endDate = c.end_date;
        }
      });
      setIncoming([...grouped.values()]);
    } else {
      setIncoming([]);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

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

    // Governance: max 5 connectors — friendly guard before the RPC.
    if (connections.length >= MAX_CONNECTORS) {
      toast.error(
        "Connection limit reached. Please remove a connector to add a new one.",
      );
      return;
    }

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

  // Self-removal: I (the connector) drop every contract this owner has on me,
  // instantly revoking my access to their tasks.
  const disconnectFromOwner = async (ownerId: string) => {
    if (!user) return;
    setDisconnecting(ownerId);
    const { error } = await supabase
      .from("active_contracts")
      .delete()
      .eq("owner_id", ownerId)
      .eq("connector_id", user.id);
    setDisconnecting(null);
    if (error) {
      toast.error("Couldn't disconnect.");
      return;
    }
    toast.success("Disconnected — their tasks are no longer visible to you.");
    load();
  };

  const atLimit = connections.length >= MAX_CONNECTORS;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
      <p className="flex items-center justify-between gap-1.5 text-sm font-bold text-primary">
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4" /> Team &amp; Connections
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px]",
            atLimit
              ? "bg-destructive/20 text-destructive"
              : "bg-primary/15 text-primary",
          )}
        >
          {connections.length}/{MAX_CONNECTORS} used
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
            disabled={joining || joinCode.trim().length !== 6 || atLimit}
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
        {atLimit && (
          <p className="mt-1.5 text-[11px] text-destructive">
            Connection limit reached. Please remove a connector to add a new one.
          </p>
        )}
      </div>

      {/* My connectors — I can delegate tasks to them */}
      {connections.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs text-muted-foreground">
            Your connectors — delegate specific tasks
          </p>
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
                  onClick={() => setDelegating(c)}
                  className="flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20"
                  aria-label={`Delegate tasks to ${c.display_name || c.email}`}
                >
                  <Settings2 className="h-3 w-3" /> Delegate
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Contracts assigned to me — I can self-remove */}
      {incoming.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs text-muted-foreground">
            Shared with you — active contracts
          </p>
          <ul className="space-y-1.5">
            {incoming.map((c) => (
              <li
                key={c.owner.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-2.5 py-2"
              >
                <Avatar
                  name={c.owner.display_name || c.owner.full_name}
                  email={c.owner.email}
                  url={null}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {c.owner.display_name || c.owner.full_name || c.owner.email}
                  </p>
                  <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                    <CalendarClock className="h-3 w-3" />
                    {c.taskCount} task{c.taskCount === 1 ? "" : "s"} · {c.startDate} → {c.endDate}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => disconnectFromOwner(c.owner.id)}
                  disabled={disconnecting === c.owner.id}
                  className="flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                  aria-label={`Disconnect from ${c.owner.display_name || c.owner.email}`}
                >
                  {disconnecting === c.owner.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <LogOut className="h-3 w-3" />
                  )}
                  Disconnect
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
                ? "Use Delegate to sign a per-connector contract"
                : "Sharing paused — no new contracts will apply"}
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

      {delegating && (
        <DelegationWizard
          connector={delegating}
          onClose={() => setDelegating(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
