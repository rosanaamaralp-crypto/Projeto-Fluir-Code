/**
 * AuthContext — estado global de autenticação.
 *
 * Usa fetch direto (não o cliente gerado) para chamadas de auth,
 * pois o contexto precisa de controle imperativo da sessão.
 *
 * GET  /api/auth/me  → restaura sessão existente na montagem
 * POST /api/auth/login → autentica e salva o usuário no estado
 * POST /api/auth/logout → destrói a sessão e limpa o estado
 *
 * Contratos confirmados do backend (auth.controller.ts + session.ts):
 * - Login response: { user: { id, roleId, name, email, ... } }
 * - Me response:   { user: { userId, roleId, name, email } }
 * - Session cookie: connect.sid (httpOnly, sameSite: lax, maxAge: 8h)
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Shape canônico armazenado no contexto — equivalente à sessão do backend.
// Nota: GET /api/auth/me retorna { userId, roleId, name, email }.
export interface AuthUser {
  userId: string;
  roleId: number;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Tipos mínimos das respostas do backend (confirmados em auth.controller.ts)
interface LoginApiUser {
  id: string;
  roleId: number;
  name: string;
  email: string;
}

interface LoginApiResponse {
  user: LoginApiUser;
}

interface MeApiUser {
  userId: string;
  roleId: number;
  name: string;
  email: string;
}

interface MeApiResponse {
  user: MeApiUser;
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      (body as { error?: { message?: string } })?.error?.message ??
      `HTTP ${response.status}`;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaurar sessão existente na montagem
  useEffect(() => {
    apiFetch<MeApiResponse>("/api/auth/me")
      .then(({ user: u }) => {
        setUser({
          userId: u.userId,
          roleId: u.roleId,
          name: u.name,
          email: u.email,
        });
      })
      .catch(() => {
        // 401 = não autenticado; estado permanece null
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: u } = await apiFetch<LoginApiResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    // Login retorna { id } mas a sessão usa { userId } — normalizamos aqui
    setUser({
      userId: u.id,
      roleId: u.roleId,
      name: u.name,
      email: u.email,
    });
  }, []);

  const logout = useCallback(async () => {
    await apiFetch<{ message: string }>("/api/auth/logout", {
      method: "POST",
    });
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
