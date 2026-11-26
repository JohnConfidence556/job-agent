"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, loading: true });
export const useAuth = () => useContext(AuthContext);

interface ToastApi {
  toast: (message: string, tone?: "ok" | "error") => void;
}
const ToastContext = createContext<ToastApi>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, loading: false }));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<{ id: number; message: string; tone: "ok" | "error" }[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((message: string, tone: "ok" | "error" = "ok") => {
    const id = nextId.current++;
    setItems((current) => [...current, { id, message, tone }]);
    setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="no-print pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={
              "pointer-events-auto max-w-md rounded-[10px] px-4 py-2.5 text-sm font-medium shadow-lg " +
              (item.tone === "error" ? "bg-chalk text-white" : "bg-ink text-white")
            }
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
