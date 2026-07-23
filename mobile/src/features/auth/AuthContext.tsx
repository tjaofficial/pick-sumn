import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ApiError } from "@/services/api";

import {
  authenticateWithDevice,
  disableBiometricUnlock,
  enableBiometricUnlock,
  getBiometricCapability,
  getBiometricUserId,
} from "./biometricAuth";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  socialLogin as socialLoginRequest,
} from "./authService";
import {
  clearTokens,
  getAccessToken,
} from "./tokenStorage";
import type {
  LoginInput,
  RegisterInput,
  SocialLoginInput,
  User,
} from "./types";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasStoredSession: boolean;
  biometricLabel: string;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  socialLogin: (input: SocialLoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearAuthenticatedSession: () => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
  setBiometricEnabled: (enabled: boolean) => Promise<boolean>;
  refreshBiometricStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasStoredSession, setHasStoredSession] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState(
    "Device Authentication",
  );
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  async function loadBiometricState(
    currentUserId?: number,
  ) {
    const [
      capability,
      biometricUserId,
    ] = await Promise.all([
      getBiometricCapability(),
      getBiometricUserId(),
    ]);

    setBiometricLabel(
      capability.label,
    );

    setBiometricAvailable(
      capability.available,
    );

    setBiometricEnabledState(
      biometricUserId !== null
      && (
        currentUserId === undefined
        || biometricUserId === currentUserId
      ),
    );

    return {
      capability,
      biometricUserId,
    };
  }

  useEffect(() => {
    async function restoreSession() {
      try {
        const accessToken =
          await getAccessToken();

        setHasStoredSession(
          Boolean(accessToken),
        );

        if (!accessToken) {
          await loadBiometricState();
          return;
        }

        const currentUser =
          await getCurrentUser();

        const {
          capability,
          biometricUserId,
        } = await loadBiometricState(
          currentUser.id,
        );

        const shouldUnlock =
          capability.available
          && biometricUserId === currentUser.id;

        if (shouldUnlock) {
          const unlocked =
            await authenticateWithDevice(
              capability.label,
            );

          if (!unlocked) {
            return;
          }
        }

        setUser(
          currentUser,
        );
      } catch (error) {
        if (
          error instanceof ApiError
          && error.status === 401
        ) {
          await clearTokens();
          setHasStoredSession(false);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    }

    void restoreSession();
  }, []);

  async function login(
    input: LoginInput,
  ) {
    const authenticatedUser =
      await loginRequest(input);

    setUser(
      authenticatedUser,
    );

    setHasStoredSession(true);

    await loadBiometricState(
      authenticatedUser.id,
    );
  }

  async function register(
    input: RegisterInput,
  ) {
    const authenticatedUser =
      await registerRequest(input);

    setUser(
      authenticatedUser,
    );

    setHasStoredSession(true);

    await loadBiometricState(
      authenticatedUser.id,
    );
  }

  async function socialLogin(
    input: SocialLoginInput,
  ) {
    const authenticatedUser =
      await socialLoginRequest(
        input,
      );

    setUser(
      authenticatedUser,
    );

    setHasStoredSession(true);

    await loadBiometricState(
      authenticatedUser.id,
    );
  }

  async function logout() {
    await logoutRequest();

    setUser(null);
    setHasStoredSession(false);
  }

  async function refreshUser() {
    const currentUser =
      await getCurrentUser();

    setUser(
      currentUser,
    );

    await loadBiometricState(
      currentUser.id,
    );
  }

  async function clearAuthenticatedSession() {
    await clearTokens();

    setUser(null);
    setHasStoredSession(false);
  }

  async function unlockWithBiometrics(): Promise<boolean> {
    const accessToken =
      await getAccessToken();

    if (!accessToken) {
      setHasStoredSession(false);
      return false;
    }

    setHasStoredSession(true);

    try {
      const currentUser =
        await getCurrentUser();

      const {
        capability,
        biometricUserId,
      } = await loadBiometricState(
        currentUser.id,
      );

      if (
        !capability.available
        || biometricUserId !== currentUser.id
      ) {
        return false;
      }

      const unlocked =
        await authenticateWithDevice(
          capability.label,
        );

      if (!unlocked) {
        return false;
      }

      setUser(
        currentUser,
      );

      return true;
    } catch (error) {
      if (
        error instanceof ApiError
        && error.status === 401
      ) {
        await clearTokens();
        setHasStoredSession(false);
      }

      return false;
    }
  }

  async function setBiometricEnabled(
    enabled: boolean,
  ): Promise<boolean> {
    if (!user) {
      return false;
    }

    if (!enabled) {
      await disableBiometricUnlock();

      setBiometricEnabledState(
        false,
      );

      return true;
    }

    const capability =
      await getBiometricCapability();

    setBiometricLabel(
      capability.label,
    );

    setBiometricAvailable(
      capability.available,
    );

    if (!capability.available) {
      return false;
    }

    const verified =
      await authenticateWithDevice(
        capability.label,
      );

    if (!verified) {
      return false;
    }

    await enableBiometricUnlock(
      user.id,
    );

    setBiometricEnabledState(
      true,
    );

    return true;
  }

  async function refreshBiometricStatus() {
    await loadBiometricState(
      user?.id,
    );
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      hasStoredSession,
      biometricLabel,
      biometricAvailable,
      biometricEnabled,
      login,
      register,
      socialLogin,
      logout,
      refreshUser,
      clearAuthenticatedSession,
      unlockWithBiometrics,
      setBiometricEnabled,
      refreshBiometricStatus,
    }),
    [
      user,
      isLoading,
      hasStoredSession,
      biometricLabel,
      biometricAvailable,
      biometricEnabled,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context =
    useContext(
      AuthContext,
    );

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider.",
    );
  }

  return context;
}
