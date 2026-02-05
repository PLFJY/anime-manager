import { ref, watch } from "vue";
import { useTheme } from "vuetify";

export type ThemeMode = "system" | "light" | "dark";

const SETTINGS_KEY = "anime-manager.settings.v1";
const systemMedia = window.matchMedia("(prefers-color-scheme: dark)");

export const useSettings = () => {
  const baseDir = ref("F:\\Videos");
  const themeMode = ref<ThemeMode>("system");
  const accentColor = ref("#0078D4");
  const autoRefresh = ref(false);

  let vuetifyTheme: ReturnType<typeof useTheme> | null = null;

  const setVuetifyTheme = (theme: ReturnType<typeof useTheme>) => {
    vuetifyTheme = theme;
  };

  const applyTheme = () => {
    const isDark =
      themeMode.value === "dark" ||
      (themeMode.value === "system" && systemMedia.matches);
    const nextTheme = isDark ? "dark" : "light";

    // Update CSS variables
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;

    // Update Vuetify theme
    if (vuetifyTheme) {
      vuetifyTheme.global.name.value = nextTheme;
    }
  };

  const parseHexColor = (value: string) => {
    const hex = value.replace("#", "").trim();
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b };
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }
    return { r: 0, g: 120, b: 212 };
  };

  const clamp = (value: number) => Math.max(0, Math.min(255, value));

  const lighten = (value: number, amount: number) =>
    clamp(Math.round(value + (255 - value) * amount));

  const applyAccent = () => {
    const color = accentColor.value || "#0078D4";
    const { r, g, b } = parseHexColor(color);
    const strong = `rgb(${lighten(r, 0.14)}, ${lighten(g, 0.14)}, ${lighten(
      b,
      0.14
    )})`;
    const soft = `rgba(${r}, ${g}, ${b}, 0.1)`;

    document.documentElement.style.setProperty("--accent", color);
    document.documentElement.style.setProperty("--accent-strong", strong);
    document.documentElement.style.setProperty("--accent-soft", soft);

    // Update Vuetify theme colors
    if (vuetifyTheme) {
      vuetifyTheme.themes.value.light.colors.primary = color;
      vuetifyTheme.themes.value.dark.colors.primary = strong;
    }
  };

  const persistSettings = () => {
    const payload = {
      baseDir: baseDir.value,
      themeMode: themeMode.value,
      accentColor: accentColor.value,
      autoRefresh: autoRefresh.value,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
  };

  const loadSettings = () => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.baseDir === "string") baseDir.value = parsed.baseDir;
      if (
        parsed.themeMode === "system" ||
        parsed.themeMode === "light" ||
        parsed.themeMode === "dark"
      ) {
        themeMode.value = parsed.themeMode;
      }
      if (typeof parsed.accentColor === "string") {
        accentColor.value = parsed.accentColor;
      }
      if (typeof parsed.autoRefresh === "boolean") {
        autoRefresh.value = parsed.autoRefresh;
      }
    } catch {
      return;
    }
  };

  watch(themeMode, () => {
    applyTheme();
    persistSettings();
  });

  watch(accentColor, () => {
    applyAccent();
    persistSettings();
  });

  watch([baseDir, autoRefresh], () => {
    persistSettings();
  });

  systemMedia.addEventListener("change", () => {
    if (themeMode.value === "system") {
      applyTheme();
    }
  });

  return {
    baseDir,
    themeMode,
    accentColor,
    autoRefresh,
    applyTheme,
    applyAccent,
    loadSettings,
    setVuetifyTheme,
  };
};
