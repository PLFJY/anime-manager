import { FluentProvider, webDarkTheme, webLightTheme } from "@fluentui/react-components";
import { useEffect, useMemo, useRef } from "react";
import { loadLibrary, refreshLibrary } from "./services/library";
import NavRail from "./components/NavRail";
import { useDirectoryBrowser } from "./composables/useDirectoryBrowser";
import { useLayout } from "./composables/useLayout";
import { useLibrary } from "./composables/useLibrary";
import { useSettings } from "./composables/useSettings";
import DetailPage from "./pages/DetailPage";
import LibraryPage from "./pages/LibraryPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  const hasMountedRef = useRef(false);
  const {
    baseDir,
    setBaseDir,
    themeMode,
    setThemeMode,
    accentColor,
    setAccentColor,
    autoRefresh,
    setAutoRefresh,
    settingsLoaded,
    loadSettings,
  } = useSettings();

  const {
    page,
    setPage,
    navCollapsed,
    setNavCollapsed,
    filtersOpen,
    setFiltersOpen,
    showFilters,
    navSelection,
    animationsEnabled,
    setAnimationsEnabled,
    initLayout,
  } = useLayout();

  const {
    search,
    setSearch,
    items,
    setItems,
    loading,
    error,
    selectedId,
    setSelectedId,
    selected,
    statusFilter,
    fansubFilter,
    subtitleFilter,
    qualityFilter,
    statusOptions,
    fansubOptions,
    subtitleOptions,
    qualityOptions,
    hasAnyFilter,
    groupedItems,
    filteredItems,
    loadLibraryEntries: reloadFromCache,
    refreshLibraryEntries: triggerRefresh,
    toggleStatus,
    toggleFansub,
    toggleSubtitle,
    toggleQuality,
    clearAllFilters,
  } = useLibrary(baseDir);

  const {
    dirEntries,
    dirLoading,
    dirError,
    currentDir,
    rootDir,
    breadcrumbs,
    openDetail,
    openFolder,
    openEntry,
    playLast,
    navigateBreadcrumb,
    formatSize,
    formatDate,
    isVideoFile,
  } = useDirectoryBrowser({
    baseDir,
    items,
    setItems,
    selected,
    setSelectedId,
    setPage,
  });

  useEffect(() => {
    initLayout();
    loadSettings();
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    document.documentElement.classList.add("theme-switching");
    const timer = window.setTimeout(() => {
      document.documentElement.classList.remove("theme-switching");
    }, 320);

    return () => {
      window.clearTimeout(timer);
      document.documentElement.classList.remove("theme-switching");
    };
  }, [themeMode]);

  useEffect(() => {
    if (!settingsLoaded) return;
    let cancelled = false;

    const run = async () => {
      try {
        if (autoRefresh) {
          const results = await refreshLibrary(baseDir.trim());
          if (!cancelled) {
            setItems(results);
            setSelectedId(results[0]?.id ?? null);
          }
          return;
        }

        const cached = await loadLibrary(baseDir.trim());
        if (!cancelled) {
          setItems(cached);
          setSelectedId(cached[0]?.id ?? null);
        }
        if (!cached.length && !cancelled) {
          const refreshed = await refreshLibrary(baseDir.trim());
          if (!cancelled) {
            setItems(refreshed);
            setSelectedId(refreshed[0]?.id ?? null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
        }
      } finally {
        requestAnimationFrame(() => {
          if (!cancelled) {
            setAnimationsEnabled(false);
          }
        });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [settingsLoaded]);

  const resolvedTheme = useMemo(() => {
    if (themeMode === "dark") return webDarkTheme;
    if (themeMode === "light") return webLightTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? webDarkTheme
      : webLightTheme;
  }, [themeMode]);

  return (
    <FluentProvider theme={resolvedTheme} className="app-shell">
      <NavRail
        collapsed={navCollapsed}
        selection={navSelection}
        onToggle={() => setNavCollapsed(!navCollapsed)}
        onSelect={setPage}
      />

      <main className="main-content">
        <div className="page-stack">
          <SettingsPage
            active={page === "settings"}
            baseDir={baseDir}
            themeMode={themeMode}
            accentColor={accentColor}
            autoRefresh={autoRefresh}
            loading={loading}
            onBaseDirChange={setBaseDir}
            onThemeModeChange={setThemeMode}
            onAccentColorChange={setAccentColor}
            onAutoRefreshChange={setAutoRefresh}
            onRefresh={triggerRefresh}
            onLoad={reloadFromCache}
          />

          <DetailPage
            active={page === "detail"}
            selected={selected}
            dirEntries={dirEntries}
            dirLoading={dirLoading}
            dirError={dirError}
            breadcrumbs={breadcrumbs}
            currentDir={currentDir}
            rootDir={rootDir}
            formatSize={formatSize}
            formatDate={formatDate}
            isVideoFile={isVideoFile}
            onOpenFolder={openFolder}
            onOpenEntry={openEntry}
            onPlayLast={playLast}
            onNavigateBreadcrumb={navigateBreadcrumb}
          />

          <LibraryPage
            active={page === "library"}
            baseDir={baseDir}
            items={items}
            loading={loading}
            error={error}
            search={search}
            statusOptions={statusOptions}
            fansubOptions={fansubOptions}
            subtitleOptions={subtitleOptions}
            qualityOptions={qualityOptions}
            statusFilter={statusFilter}
            fansubFilter={fansubFilter}
            subtitleFilter={subtitleFilter}
            qualityFilter={qualityFilter}
            hasAnyFilter={Boolean(hasAnyFilter)}
            groupedItems={groupedItems}
            filteredItems={filteredItems}
            showFilters={showFilters}
            animationsEnabled={animationsEnabled}
            selectedId={selectedId}
            onSearchChange={setSearch}
            onToggleStatus={toggleStatus}
            onToggleFansub={toggleFansub}
            onToggleSubtitle={toggleSubtitle}
            onToggleQuality={toggleQuality}
            onClearFilters={clearAllFilters}
            onToggleFilters={() => setFiltersOpen(!filtersOpen)}
            onCloseFilters={() => setFiltersOpen(false)}
            onSelectItem={setSelectedId}
            onOpenDetail={openDetail}
          />
        </div>
      </main>
    </FluentProvider>
  );
}
