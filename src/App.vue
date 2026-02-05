<script setup lang="ts">
import { onMounted } from "vue";
import { useTheme } from "vuetify";
import NavRail from "./components/NavRail.vue";
import DetailPage from "./pages/DetailPage.vue";
import LibraryPage from "./pages/LibraryPage.vue";
import SettingsPage from "./pages/SettingsPage.vue";
import { useDirectoryBrowser } from "./composables/useDirectoryBrowser";
import { useLayout } from "./composables/useLayout";
import { useLibrary } from "./composables/useLibrary";
import { useSettings } from "./composables/useSettings";

const theme = useTheme();

const {
  baseDir,
  themeMode,
  accentColor,
  autoRefresh,
  applyTheme,
  applyAccent,
  loadSettings,
  setVuetifyTheme,
} = useSettings();

// Pass Vuetify theme instance to settings composable
setVuetifyTheme(theme);

const {
  page,
  navCollapsed,
  isCompact,
  filtersOpen,
  showFilters,
  navSelection,
  animationsEnabled,
  initLayout,
} = useLayout();

const {
  search,
  items,
  loading,
  error,
  selectedId,
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
  filteredItems,
  groupedItems,
  loadLibraryEntries,
  refreshLibraryEntries,
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
  selected,
  selectedId,
  page,
});

onMounted(async () => {
  initLayout();
  loadSettings();
  applyTheme();
  applyAccent();
  if (autoRefresh.value) {
    await refreshLibraryEntries();
  } else {
    const results = await loadLibraryEntries();
    if (!results.length && !error.value) {
      await refreshLibraryEntries();
    }
  }
  requestAnimationFrame(() => {
    animationsEnabled.value = false;
  });
});
</script>

<template>
  <v-app class="app-shell">
    <NavRail
      :collapsed="navCollapsed"
      :selection="navSelection"
      @toggle="navCollapsed = !navCollapsed"
      @select="page = $event"
    />

    <v-main class="main-content">
      <div class="page-stack">
        <SettingsPage
          :active="page === 'settings'"
          :base-dir="baseDir"
          :theme-mode="themeMode"
          :accent-color="accentColor"
          :auto-refresh="autoRefresh"
          :loading="loading"
          @update:base-dir="baseDir = $event"
          @update:theme-mode="themeMode = $event"
          @update:accent-color="accentColor = $event"
          @update:auto-refresh="autoRefresh = $event"
          @refresh="refreshLibraryEntries"
          @load="loadLibraryEntries"
        />

        <DetailPage
          :active="page === 'detail'"
          :selected="selected"
          :dir-entries="dirEntries"
          :dir-loading="dirLoading"
          :dir-error="dirError"
          :breadcrumbs="breadcrumbs"
          :current-dir="currentDir"
          :root-dir="rootDir"
          :format-size="formatSize"
          :format-date="formatDate"
          :is-video-file="isVideoFile"
          @open-folder="openFolder"
          @open-entry="openEntry"
          @play-last="playLast"
          @navigate-breadcrumb="navigateBreadcrumb"
        />

        <LibraryPage
          :active="page === 'library'"
          :base-dir="baseDir"
          :items="items"
          :loading="loading"
          :error="error"
          :search="search"
          :status-options="statusOptions"
          :fansub-options="fansubOptions"
          :subtitle-options="subtitleOptions"
          :quality-options="qualityOptions"
          :status-filter="statusFilter"
          :fansub-filter="fansubFilter"
          :subtitle-filter="subtitleFilter"
          :quality-filter="qualityFilter"
          :has-any-filter="hasAnyFilter"
          :grouped-items="groupedItems"
          :filtered-items="filteredItems"
          :is-compact="isCompact"
          :show-filters="showFilters"
          :animations-enabled="animationsEnabled"
          :selected-id="selectedId"
          @update:search="search = $event"
          @toggle-status="toggleStatus"
          @toggle-fansub="toggleFansub"
          @toggle-subtitle="toggleSubtitle"
          @toggle-quality="toggleQuality"
          @clear-filters="clearAllFilters"
          @toggle-filters="filtersOpen = !filtersOpen"
          @close-filters="filtersOpen = false"
          @select-item="selectedId = $event"
          @open-detail="openDetail"
        />
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  height: 100vh;
  overflow: hidden;
  background: rgb(var(--v-theme-background));
}

.page-stack {
  position: relative;
  flex: 1;
  height: 100%;
  overflow: hidden;
}
</style>
