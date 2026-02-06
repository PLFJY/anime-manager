import { useCallback, useEffect, useMemo, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";

const SETTINGS_KEY = "anime-manager.settings.v1";

export const useSettings = () => {
  const [baseDir, setBaseDir] = useState("F:\\Videos");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [accentColor, setAccentColor] = useState("#0078D4");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const systemMedia = useMemo(
    () => window.matchMedia("(prefers-color-scheme: dark)"),
    []
  );

  const applyTheme = useCallback(() => {
    const isDark =
      themeMode === "dark" || (themeMode === "system" && systemMedia.matches);
    const nextTheme = isDark ? "dark" : "light";

    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
  }, [themeMode, systemMedia]);

  const parseHexColor = useCallback((value: string) => {
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
  }, []);

  const clamp = (value: number) => Math.max(0, Math.min(255, value));
  const lighten = (value: number, amount: number) =>
    clamp(Math.round(value + (255 - value) * amount));

  const applyAccent = useCallback(() => {
    const color = accentColor || "#0078D4";
    const { r, g, b } = parseHexColor(accentColor);
    const strong = `rgb(${lighten(r, 0.14)}, ${lighten(g, 0.14)}, ${lighten(
      b,
      0.14
    )})`;
    const soft = `rgba(${r}, ${g}, ${b}, 0.1)`;

    document.documentElement.style.setProperty("--accent", color);
    document.documentElement.style.setProperty("--accent-strong", strong);
    document.documentElement.style.setProperty("--accent-soft", soft);
  }, [accentColor, parseHexColor]);

  const persistSettings = useCallback(() => {
    const payload = {
      baseDir,
      themeMode,
      accentColor,
      autoRefresh,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
  }, [baseDir, themeMode, accentColor, autoRefresh]);

  const loadSettings = useCallback(() => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      setSettingsLoaded(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.baseDir === "string") setBaseDir(parsed.baseDir);
      if (
        parsed.themeMode === "system" ||
        parsed.themeMode === "light" ||
        parsed.themeMode === "dark"
      ) {
        setThemeMode(parsed.themeMode);
      }
      if (typeof parsed.accentColor === "string") {
        setAccentColor(parsed.accentColor);
      }
      if (typeof parsed.autoRefresh === "boolean") {
        setAutoRefresh(parsed.autoRefresh);
      }
    } catch {
      return;
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  useEffect(() => {
    applyTheme();
    persistSettings();
  }, [themeMode, applyTheme, persistSettings]);

  useEffect(() => {
    applyAccent();
    persistSettings();
  }, [accentColor, applyAccent, persistSettings]);

  useEffect(() => {
    persistSettings();
  }, [baseDir, autoRefresh, persistSettings]);

  useEffect(() => {
    const onSystemThemeChange = () => {
      if (themeMode === "system") {
        applyTheme();
      }
    };

    systemMedia.addEventListener("change", onSystemThemeChange);
    return () => systemMedia.removeEventListener("change", onSystemThemeChange);
  }, [themeMode, applyTheme, systemMedia]);

  return {
    baseDir,
    setBaseDir,
    themeMode,
    setThemeMode,
    accentColor,
    setAccentColor,
    autoRefresh,
    setAutoRefresh,
    settingsLoaded,
    applyTheme,
    applyAccent,
    loadSettings,
  };
};
