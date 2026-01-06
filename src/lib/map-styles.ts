export const DARK_STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
export const LIGHT_STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export function getStyleUrl(theme: "dark" | "light" = "dark"): string {
  return theme === "light" ? LIGHT_STYLE_URL : DARK_STYLE_URL;
}
