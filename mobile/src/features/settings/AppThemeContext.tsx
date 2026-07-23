import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Colors,
  type AppColorScheme,
} from "@/constants/theme";
import {
  useAuth,
} from "@/features/auth/AuthContext";
import {
  getAppSettings,
  updateAppSettings,
} from "@/features/settings/settingsService";
import type {
  AppTheme,
} from "@/features/settings/types";
import {
  setActiveThemeScheme,
} from "@/theme/themedStyleSheet";


type AppThemeContextValue = {
  preference: AppTheme;
  colorScheme: AppColorScheme;
  colors:
    (typeof Colors)[AppColorScheme];
  isLoading: boolean;
  setPreference: (
    preference: AppTheme,
  ) => Promise<void>;
  refreshThemePreference: () => Promise<void>;
};


const AppThemeContext =
  createContext<
    AppThemeContextValue
    | undefined
  >(undefined);


type AppThemeProviderProps = {
  children: ReactNode;
};


export function AppThemeProvider({
  children,
}: AppThemeProviderProps) {
  const {
    isAuthenticated,
  } = useAuth();

  const [
    preference,
    setPreferenceState,
  ] = useState<AppTheme>(
    "light",
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);


  const refreshThemePreference =
    useCallback(
      async () => {
        if (!isAuthenticated) {
          setPreferenceState(
            "light",
          );

          return;
        }

        try {
          setIsLoading(true);

          const settings =
            await getAppSettings();

          setPreferenceState(
            settings.theme
            === "dark"
              ? "dark"
              : "light",
          );
        } catch {
          // Keep the last known/local fallback.
        } finally {
          setIsLoading(false);
        }
      },
      [isAuthenticated],
    );


  useEffect(() => {
    void refreshThemePreference();
  }, [
    refreshThemePreference,
  ]);


  const colorScheme:
    AppColorScheme =
    preference;


  setActiveThemeScheme(
    colorScheme,
  );


  const setPreference =
    useCallback(
      async (
        nextPreference:
          AppTheme,
      ) => {
        const previous =
          preference;

        setPreferenceState(
          nextPreference,
        );

        try {
          const saved =
            await updateAppSettings({
              theme:
                nextPreference,
            });

          setPreferenceState(
            saved.theme,
          );
        } catch (error) {
          setPreferenceState(
            previous,
          );

          throw error;
        }
      },
      [preference],
    );


  const value =
    useMemo<
      AppThemeContextValue
    >(
      () => ({
        preference,
        colorScheme,
        colors:
          Colors[colorScheme],
        isLoading,
        setPreference,
        refreshThemePreference,
      }),
      [
        preference,
        colorScheme,
        isLoading,
        setPreference,
        refreshThemePreference,
      ],
    );


  return (
    <AppThemeContext.Provider
      value={value}
    >
      {children}
    </AppThemeContext.Provider>
  );
}


export function useAppTheme():
  AppThemeContextValue {
  const context =
    useContext(
      AppThemeContext,
    );

  if (!context) {
    throw new Error(
      "useAppTheme must be used inside AppThemeProvider.",
    );
  }

  return context;
}
