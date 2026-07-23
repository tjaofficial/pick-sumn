import {
  StyleSheet,
  type TextStyle,
  type ViewStyle,
  type ImageStyle,
} from "react-native";

import {
  type AppColorScheme,
} from "@/constants/theme";


let activeThemeScheme:
  AppColorScheme = "light";


export function setActiveThemeScheme(
  scheme: AppColorScheme,
) {
  activeThemeScheme = scheme;
}


type NamedStyle =
  | ViewStyle
  | TextStyle
  | ImageStyle;

type NamedStyles<T> = {
  [P in keyof T]:
    NamedStyle;
};


const LIGHT_BACKGROUND_MAP:
  Record<string, string> = {
    "#FFFFFF": "#141C27",
    "#FFFDFB": "#080D14",
    "#FFF9F2": "#0B111A",
    "#FFF9FA": "#0B111A",
    "#FFF7F8": "#0B111A",
    "#FFF6F7": "#171119",
    "#FFF4F4": "#241517",
    "#FFF3F5": "#23151A",
    "#FFF2E8": "#251A13",
    "#FFF1F1": "#2C1719",
    "#FFF0F2": "#2A1720",
    "#FFF0F0": "#2C1719",
    "#FFF9E8": "#211E13",
    "#FFF8E8": "#211E13",
    "#FFF8DF": "#211E13",
    "#FFF5DD": "#211E13",
    "#FFF4D8": "#211E13",
    "#FFF4CC": "#211E13",
    "#FFF1B8": "#26200E",
    "#F8F8F9": "#1A2431",
    "#F7F8FA": "#1A2431",
    "#F5F6F7": "#18212C",
    "#F4F5F6": "#18212C",
    "#F3F4F6": "#18212C",
    "#F2F3F5": "#18212C",
    "#F1F2F4": "#18212C",
    "#F0F0F3": "#212B37",
    "#EDF3FF": "#152236",
    "#EDF2F8": "#15202C",
    "#EFFAF3": "#102A1D",
    "#F2FAF5": "#102A1D",
    "#E8F7EF": "#102A1D",
    "#E0F5E9": "#102A1D",
    "#DDF4E6": "#123020",
    "#F2ECFF": "#211A31",
    "#FFE7EA": "#2A1720",
  };


const LIGHT_TEXT_MAP:
  Record<string, string> = {
    "#07111F": "#F7F8FA",
    "#000000": "#F7F8FA",
    "#151F2D": "#F7F8FA",
    "#172332": "#F7F8FA",
    "#202B38": "#F7F8FA",
    "#242B35": "#F7F8FA",
    "#26313E": "#F7F8FA",
    "#303B49": "#E8EBEF",
    "#343B46": "#E2E6EB",
    "#4E5662": "#C7CED7",
    "#4F5662": "#C7CED7",
    "#5F6671": "#BCC4CE",
    "#606773": "#BCC4CE",
    "#69707C": "#B5BDC8",
    "#727985": "#AEB7C2",
    "#737A85": "#AEB7C2",
    "#777E89": "#A8B1BC",
    "#7B818B": "#A6AFBA",
    "#9096A0": "#929DAA",
    "#9298A2": "#87919E",
    "#A2A7AF": "#87919E",
    "#A4A9B2": "#87919E",
    "#A7ADB6": "#8F99A6",
    "#A7ADB7": "#8F99A6",
    "#AAB1BC": "#8F99A6",
    "#B0B4BA": "#B5BDC8",
    "#B6BDC7": "#9BA5B1",
    "#C1C7D0": "#B5BDC8",
    "#C5CBD3": "#AAB3BE",
  };


const LIGHT_BORDER_MAP:
  Record<string, string> = {
    "#ECEDEF": "#273240",
    "#E3E6EA": "#273240",
    "#E3E5E8": "#273240",
    "#E2E5EA": "#273240",
    "#E1E4E8": "#273240",
    "#E1E3E7": "#273240",
    "#E0E3E7": "#273240",
    "#DDE1E7": "#303C4A",
    "#DCE1E7": "#303C4A",
    "#D9DDE3": "#394655",
    "#D8DCE2": "#394655",
    "#CDD1D7": "#465362",
    "#C7CBD1": "#465362",
    "#F3C5C5": "#6B363B",
    "#F3B6BE": "#713840",
    "#F7B6BE": "#713840",
    "#F0BABA": "#713840",
    "#E8A7A7": "#713840",
    "#F0DDA4": "#5A4A22",
    "#F0D79C": "#5A4A22",
    "#BFE2CF": "#28563C",
    "#B8E4CA": "#28563C",
    "#D7ECE0": "#28563C",
  };


const ACCENT_MAP:
  Record<string, string> = {
    "#F3344A": "#FF4D62",
    "#C62828": "#FF6B6B",
    "#D62828": "#FF6B6B",
    "#9F2424": "#FF8585",
    "#168B4F": "#42B97A",
    "#116A3D": "#42B97A",
    "#21A05A": "#42B97A",
    "#397A58": "#69C68F",
    "#3C5146": "#9ED5B5",
    "#4C6156": "#A8D7BB",
    "#E3A008": "#F4BE3F",
    "#D99A00": "#F4BE3F",
    "#A66B00": "#E4B85C",
    "#9A6C00": "#E4B85C",
    "#805A00": "#D7B665",
    "#8A5C00": "#D7B665",
    "#7A5A19": "#D7B665",
    "#5B5133": "#D0C39C",
    "#7C4DCC": "#A98AE8",
    "#8E44AD": "#B47AD0",
    "#3A72D8": "#74A1FF",
    "#3C87F7": "#72A7FF",
    "#3C9FFE": "#70B8FF",
    "#0274DF": "#70B8FF",
    "#208AEF": "#70B8FF",
    "#FF9A38": "#FFAD62",
    "#B05C00": "#E48B3C",
  };


function normalizeHex(
  value: string,
): string {
  return value.toUpperCase();
}


export function themeColor(
  value: string,
  property:
    | "color"
    | "backgroundColor"
    | "borderColor"
    | "shadowColor"
    | "other"
    = "color",
): string {
  if (
    activeThemeScheme === "light"
    || !value.startsWith("#")
  ) {
    return value;
  }

  const hex =
    normalizeHex(value);

  if (ACCENT_MAP[hex]) {
    return ACCENT_MAP[hex];
  }

  if (
    property === "backgroundColor"
  ) {
    return (
      LIGHT_BACKGROUND_MAP[hex]
      ?? value
    );
  }

  if (
    property === "borderColor"
  ) {
    return (
      LIGHT_BORDER_MAP[hex]
      ?? value
    );
  }

  if (
    property === "shadowColor"
  ) {
    return value;
  }

  if (hex === "#FFFFFF") {
    return "#FFFFFF";
  }

  return (
    LIGHT_TEXT_MAP[hex]
    ?? value
  );
}


function mapStyleValue(
  property: string,
  value: unknown,
): unknown {
  if (
    typeof value === "string"
    && value.startsWith("#")
  ) {
    if (
      property
      === "backgroundColor"
    ) {
      return themeColor(
        value,
        "backgroundColor",
      );
    }

    if (
      property === "borderColor"
      || property.endsWith(
        "BorderColor",
      )
    ) {
      return themeColor(
        value,
        "borderColor",
      );
    }

    if (
      property === "shadowColor"
    ) {
      return themeColor(
        value,
        "shadowColor",
      );
    }

    if (
      property === "color"
      || property
        .toLowerCase()
        .includes("color")
    ) {
      return themeColor(
        value,
        "color",
      );
    }
  }

  return value;
}


function mapStyleObject<
  T extends NamedStyle,
>(
  style: T,
): T {
  const result = {
    ...style,
  } as Record<
    string,
    unknown
  >;

  for (
    const [key, value]
    of Object.entries(
      result,
    )
  ) {
    result[key] =
      mapStyleValue(
        key,
        value,
      );
  }

  return result as T;
}


export function createThemedStyleSheet<
  T extends NamedStyles<T>,
>(
  styles: T,
): T {
  // Run through StyleSheet.create only for React Native's type/runtime
  // validation, but keep the ORIGINAL style objects for the dynamic
  // light/dark mapping below.
  StyleSheet.create(
    styles,
  );

  return new Proxy(
    styles,
    {
      get(
        target,
        property,
        receiver,
      ) {
        const value =
          Reflect.get(
            target,
            property,
            receiver,
          );

        if (
          !value
          || typeof value
          !== "object"
        ) {
          return value;
        }

        return mapStyleObject(
          value as NamedStyle,
        );
      },
    },
  ) as T;
}
