import {
  useAppTheme,
} from "@/features/settings/AppThemeContext";


export function useTheme() {
  return useAppTheme().colors;
}
