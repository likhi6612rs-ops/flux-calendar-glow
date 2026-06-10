import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  MessageSquare,
  ShieldCheck,
  Search,
  Activity,
  Check,
  X,
  Phone,
  CreditCard,
  Loader2,
  SlidersHorizontal,
  Megaphone,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { tierLabel, type Tier } from "@/lib/premium";
import {
  DEFAULT_FEATURES,
  isNewerVersion,
  type AppFeatures,
} from "@/lib/app-config";
import { format } from "date-fns";

/** Bumps the patch segment of a dotted version, e.g. 1.0.1 -> 1.0.2. */
function bumpVersion(v: string): string {
  const parts = v.split(".").map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.join(".");
}

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal · Flux" },
      {
        name: "description",
        content: "Flux executive admin panel for reviewing users and feedback.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin Portal · Flux" },
      {
        property: "og:description",
        content: "Flux executive admin panel for reviewing users and feedback.",
      },
      { property: "og:url", content: "https://flux-calendar-glow.lovable.app/admin" },
    ],
    links: [
      { rel: "canonical", href: "https://flux-calendar-glow.lovable.app/admin" },
    ],
  }),
  component: AdminPage,
});

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  mobile: string | null;
  tier: Tier;
  created_at: string;
  updated_at: string;
}
interface RoleRow {
  user_id: string;
  role: string;
}
interface FeedbackRow {
  id: string;
  email: string;
  message: string;
  created_at: string;
}
interface SubRequestRow {
  id: string;
  user_id: string;
  tier: Tier;
  amount: number;
  currency: string;
  utr: string;
  status: string;
  created_at: string;
}

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/", replace: true });
  }, [isAdmin, loading, navigate]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin", "profiles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, mobile, tier, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProfileRow[];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin", "roles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (error) throw error;
      return data as RoleRow[];
    },
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ["admin", "feedback"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("id, email, message, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FeedbackRow[];
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["admin", "subscription_requests"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_requests")
        .select("id, user_id, tier, amount, currency, utr, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SubRequestRow[];
    },
  });

  /* ----- Live feature control panel ----- */
  const { data: appConfig } = useQuery({
    queryKey: ["admin", "app_config"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_config")
        .select("app_version, features")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return {
        app_version: data?.app_version ?? "1.0.0",
        features: {
          ...DEFAULT_FEATURES,
          ...((data?.features ?? {}) as Partial<AppFeatures>),
        } as AppFeatures,
      };
    },
  });

  const [draft, setDraft] = useState<AppFeatures | null>(null);
  useEffect(() => {
    if (appConfig && !draft) setDraft(appConfig.features);
  }, [appConfig, draft]);

  const dirty =
    !!draft &&
    !!appConfig &&
    JSON.stringify(draft) !== JSON.stringify(appConfig.features);

  const publish = useMutation({
    mutationFn: async (features: AppFeatures) => {
      const next = bumpVersion(appConfig?.app_version ?? "1.0.0");
      const { error } = await supabase
        .from("app_config")
        .update({ app_version: next, features })
        .eq("id", 1);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      toast.success(`Pushed live · v${next} sent to all users.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "app_config"] });
    },
    onError: () => toast.error("Couldn't push the update. Try again."),
  });


  const profileById = useMemo(() => {
    const m = new Map<string, ProfileRow>();
    profiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  const review = useMutation({
    mutationFn: async ({
      req,
      approve,
    }: {
      req: SubRequestRow;
      approve: boolean;
    }) => {
      const { error: reqErr } = await supabase
        .from("subscription_requests")
        .update({ status: approve ? "approved" : "rejected" })
        .eq("id", req.id);
      if (reqErr) throw reqErr;
      if (approve) {
        const { error: profErr } = await supabase
          .from("profiles")
          .update({ tier: req.tier })
          .eq("id", req.user_id);
        if (profErr) throw profErr;
      }
    },
    onSuccess: (_d, vars) => {
      toast.success(
        vars.approve
          ? `Approved — upgraded to ${tierLabel(vars.req.tier)}.`
          : "Request rejected.",
      );
      queryClient.invalidateQueries({
        queryKey: ["admin", "subscription_requests"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "profiles"] });
    },
    onError: () => toast.error("Couldn't update this request. Try again."),
  });

  const roleMap = useMemo(() => {
    const m = new Map<string, string>();
    roles.forEach((r) => {
      if (r.role === "admin") m.set(r.user_id, "admin");
      else if (!m.has(r.user_id)) m.set(r.user_id, "user");
    });
    return m;
  }, [roles]);

  const filtered = useMemo(
    () =>
      profiles.filter((p) =>
        p.email.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [profiles, search],
  );

  if (!isAdmin) return null;


  return (
    <div className="mx-auto min-h-screen max-w-3xl px-5 pb-16 pt-8">
      <header className="mb-6 flex items-center gap-3">
        <Link
          to="/"
          aria-label="Back to dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/50 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary-glow">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin Portal
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Executive Panel
          </h1>
        </div>
      </header>

      {/* Metrics */}
      <div className="mb-7 grid grid-cols-3 gap-3">
        <Metric icon={Users} label="Registered" value={profiles.length} />
        <Metric icon={CreditCard} label="Pending" value={requests.length} />
        <Metric icon={MessageSquare} label="Feedback" value={feedback.length} />
      </div>

      {/* Pending payment approvals */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
          <CreditCard className="h-4 w-4 text-primary" /> Pending Approvals
          {requests.length > 0 && (
            <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-bold text-destructive">
              {requests.length}
            </span>
          )}
        </h2>
        <div className="space-y-2.5">
          {requests.map((req) => {
            const p = profileById.get(req.user_id);
            const busy =
              review.isPending && review.variables?.req.id === req.id;
            return (
              <div
                key={req.id}
                className="rounded-2xl border border-border bg-card/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {p?.full_name || "Unnamed user"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p?.email ?? "—"}
                    </p>
                    {p?.mobile && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {p.mobile}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary-glow">
                    {tierLabel(req.tier)} · ₹{req.amount}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
                  <span className="text-xs text-muted-foreground">UTR</span>
                  <span className="font-mono text-sm font-bold tracking-wider">
                    {req.utr}
                  </span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {format(new Date(req.created_at), "MMM d · HH:mm")}
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => review.mutate({ req, approve: true })}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success py-2 text-sm font-bold text-success-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    )}
                    Approve Account
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => review.mutate({ req, approve: false })}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-destructive py-2 text-sm font-bold text-destructive-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
                  >
                    <X className="h-4 w-4" strokeWidth={3} /> Reject
                  </button>
                </div>
              </div>
            );
          })}
          {requests.length === 0 && (
            <p className="rounded-xl border border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
              No payments awaiting verification.
            </p>
          )}
        </div>
      </section>


      {/* User directory */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Users className="h-4 w-4 text-primary" /> User Directory
          </h2>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email…"
            aria-label="Search users by email"
            className="w-full rounded-xl border border-input bg-card/60 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-card/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Email</th>
                <th className="px-3 py-2.5 font-semibold">Role</th>
                <th className="hidden px-3 py-2.5 font-semibold sm:table-cell">
                  Joined
                </th>
                <th className="px-3 py-2.5 font-semibold">Last active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="max-w-[160px] truncate px-3 py-2.5">
                    {p.email}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={
                        roleMap.get(p.id) === "admin"
                          ? "rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary-glow"
                          : "rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground"
                      }
                    >
                      {roleMap.get(p.id) ?? "user"}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2.5 text-muted-foreground sm:table-cell">
                    {format(new Date(p.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Activity className="h-3 w-3 text-success" />
                      {format(new Date(p.updated_at), "MMM d")}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Feedback stream */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
          <MessageSquare className="h-4 w-4 text-primary" /> Feedback Stream
        </h2>
        <div className="space-y-2.5">
          {feedback.map((f) => (
            <div
              key={f.id}
              className="rounded-xl border border-border bg-card/40 p-3.5"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-primary-glow">
                  {f.email}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {format(new Date(f.created_at), "MMM d, yyyy · HH:mm")}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground/90">
                {f.message}
              </p>
            </div>
          ))}
          {feedback.length === 0 && (
            <p className="rounded-xl border border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
              No feedback submitted yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3.5">
      <Icon className="mb-2 h-4 w-4 text-primary" />
      <p className="text-2xl font-extrabold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
