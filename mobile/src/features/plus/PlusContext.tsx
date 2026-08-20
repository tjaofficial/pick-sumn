import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useAuth,
} from "@/features/auth/AuthContext";

import {
  getMyEntitlements,
} from "./plusService";
import {
  FREE_ENTITLEMENTS,
  type PickSumnEntitlements,
} from "./types";

type PlusContextValue = {
  entitlements: PickSumnEntitlements;
  isPlus: boolean;
  isLoading: boolean;
  refreshEntitlements: () => Promise<void>;
};

const PlusContext =
  createContext<
    PlusContextValue | undefined
  >(undefined);

export function PlusProvider({
  children,
}: PropsWithChildren) {
  const {
    isAuthenticated,
  } = useAuth();

  const [
    entitlements,
    setEntitlements,
  ] = useState<PickSumnEntitlements>(
    FREE_ENTITLEMENTS,
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const refreshEntitlements =
    useCallback(
      async () => {
        if (!isAuthenticated) {
          setEntitlements(
            FREE_ENTITLEMENTS,
          );
          return;
        }

        try {
          setIsLoading(true);
          const result =
            await getMyEntitlements();

          setEntitlements(result);
        } catch {
          setEntitlements(
            FREE_ENTITLEMENTS,
          );
        } finally {
          setIsLoading(false);
        }
      },
      [isAuthenticated],
    );

  useEffect(() => {
    void refreshEntitlements();
  }, [refreshEntitlements]);

  const value =
    useMemo<PlusContextValue>(
      () => ({
        entitlements,
        isPlus:
          entitlements.is_plus,
        isLoading,
        refreshEntitlements,
      }),
      [
        entitlements,
        isLoading,
        refreshEntitlements,
      ],
    );

  return (
    <PlusContext.Provider
      value={value}
    >
      {children}
    </PlusContext.Provider>
  );
}

export function usePlus():
  PlusContextValue {
  const context =
    useContext(
      PlusContext,
    );

  if (!context) {
    throw new Error(
      "usePlus must be used inside PlusProvider.",
    );
  }

  return context;
}
