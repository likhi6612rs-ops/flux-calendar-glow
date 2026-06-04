import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  MessageSquare,
  ShieldCheck,
  Search,
  Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

interface ProfileRow {
  id: string;
  email: string;
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

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
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
        .select("id, email, created_at, updated_at")
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

  const adminCount = useMemo(
    () => [...roleMap.values()].filter((r) => r === "admin").length,
    [roleMap],
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
        <Metric icon={ShieldCheck} label="Admins" value={adminCount} />
        <Metric icon={MessageSquare} label="Feedback" value={feedback.length} />
      </div>

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
