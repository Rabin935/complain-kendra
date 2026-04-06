import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { getApiErrorMessage, setAuthToken } from "../../../utils/api";
import type {
  AuthContextValue,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "../types/auth.types";
import * as authService from "../services/auth.service";

const TOKEN_STORAGE_KEY = "complain-kendra:token";
const USER_STORAGE_KEY = "complain-kendra:user";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    (candidate.role === "user" || candidate.role === "admin")
  );
}

function isStoredToken(token: string | null): token is string {
  return Boolean(token && token.split(".").length === 3);
}

async function persistSession(token: string, user: AuthUser): Promise<void> {
  await AsyncStorage.setMany({
    [TOKEN_STORAGE_KEY]: token,
    [USER_STORAGE_KEY]: JSON.stringify(user),
  });
  setAuthToken(token);
}

async function clearPersistedSession(): Promise<void> {
  await AsyncStorage.removeMany([TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
  setAuthToken(null);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        const storedSession = await AsyncStorage.getMany([
          TOKEN_STORAGE_KEY,
          USER_STORAGE_KEY,
        ]);
        const storedToken = storedSession[TOKEN_STORAGE_KEY];
        const storedUser = storedSession[USER_STORAGE_KEY];

        if (!isStoredToken(storedToken) || !storedUser) {
          await clearPersistedSession();
          return;
        }

        const parsedUser = JSON.parse(storedUser) as unknown;

        if (!isAuthUser(parsedUser)) {
          await clearPersistedSession();
          return;
        }

        setAuthToken(storedToken);
        setToken(storedToken);
        setUser(parsedUser);
      } catch {
        await clearPersistedSession();
      } finally {
        setInitializing(false);
      }
    }

    void restoreSession();
  }, []);

  async function login(payload: LoginPayload): Promise<void> {
    setLoading(true);

    try {
      const response = await authService.login(payload);

      if (!response.token || !response.user) {
        throw new Error("Login failed. Please try again.");
      }

      await persistSession(response.token, response.user);
      setToken(response.token);
      setUser(response.user);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function register(payload: RegisterPayload): Promise<void> {
    setLoading(true);

    try {
      const response = await authService.register(payload);

      if (!response.token || !response.user) {
        throw new Error("Registration completed, but sign-in failed.");
      }

      await persistSession(response.token, response.user);
      setToken(response.token);
      setUser(response.user);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function logout(): Promise<void> {
    setLoading(true);

    try {
      await clearPersistedSession();
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        initializing,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
