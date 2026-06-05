import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);



export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();
  const roleFetched = useRef<string | null>(null);

  const fetchRole = async (uid: string) => {
    if (roleFetched.current === uid) return;
    roleFetched.current = uid;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    setIsAdmin(!!data?.some((r) => r.role === "admin"));
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setLoading(false);

      if (nextSession?.user) {
        // Defer Supabase calls outside the callback to avoid deadlocks.
        setTimeout(() => fetchRole(nextSession.user.id), 0);
      } else {
        setIsAdmin(false);
        roleFetched.current = null;
      }

      if (event === "SIGNED_OUT") {
        queryClient.clear();
        router.invalidate();
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        router.invalidate();
        queryClient.invalidateQueries();
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) fetchRole(data.session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, isAdmin, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
