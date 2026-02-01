<script setup lang="ts">
import type { LibraryEntry } from "../types";

type OptionCount = { name: string; count: number };

type GroupedItems = {
  name: string;
  items: LibraryEntry[];
};

const props = defineProps<{
  active: boolean;
  baseDir: string;
  items: LibraryEntry[];
  loading: boolean;
  error: string;
  search: string;
  statusOptions: OptionCount[];
  fansubOptions: OptionCount[];
  subtitleOptions: OptionCount[];
  qualityOptions: OptionCount[];
  statusFilter: string[];
  fansubFilter: string[];
  subtitleFilter: string[];
  qualityFilter: string[];
  hasAnyFilter: boolean;
  groupedItems: GroupedItems[];
  filteredItems: LibraryEntry[];
  isCompact: boolean;
  showFilters: boolean;
  animationsEnabled: boolean;
  selectedId: string | null;
}>();

const emit = defineEmits<{
  (event: "update:search", value: string): void;
  (event: "toggleStatus", value: string): void;
  (event: "toggleFansub", value: string): void;
  (event: "toggleSubtitle", value: string): void;
  (event: "toggleQuality", value: string): void;
  (event: "clearFilters"): void;
  (event: "toggleFilters"): void;
  (event: "closeFilters"): void;
  (event: "selectItem", value: string): void;
  (event: "selectItem", value: string): void;
  (event: "openDetail", value: LibraryEntry): void;
}>();

import { computed } from "vue";

const internalShowFilters = computed({
  get: () => props.showFilters,
  set: (val) => {
    if (!val) emit("closeFilters");
    else emit("toggleFilters");
  },
});
</script>

<template>
  <section class="page library-page" :class="{ active: active }" :aria-hidden="!active">
    <div class="page-container">
      <!-- Header -->
      <header class="page-header">
        <p class="text-caption text-medium-emphasis mb-1">Anime Library / Material 3</p>
        <h1>动漫资源管理台</h1>
        <p class="subtitle">通过 SQLite 缓存本地 manifest.yml，并提供轻量级资源浏览。</p>
        <p class="text-caption text-medium-emphasis mt-2">当前库目录：{{ baseDir }}</p>
      </header>

      <!-- Search Bar -->
      <v-card class="controls-bar mx-4 my-2 pa-0" flat>
        <v-text-field variant="solo-filled" flat label="搜索标题 / 字幕组 / 画质" prepend-inner-icon="mdi-magnify"
          :model-value="search" @update:model-value="emit('update:search', $event)" hide-details rounded="lg"
          density="comfortable" clearable />
      </v-card>

      <div class="stats-bar">
        <span>共 {{ items.length }} 条记录</span>
        <span v-if="filteredItems.length !== items.length">
          （筛选后 {{ filteredItems.length }} 条）
        </span>
        <v-progress-circular v-if="loading" indeterminate size="16" width="2" color="primary" />
        <span v-if="loading">正在读取缓存...</span>
      </div>

      <!-- Main Layout -->
      <v-layout class="library-layout full-height">
        <!-- Content Area -->
        <v-main class="library-content">
          <!-- Loading State -->
          <div v-if="loading" class="loading-state">
            <v-progress-circular indeterminate color="primary" size="48" />
            <span class="mt-4">正在读取缓存...</span>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="d-flex justify-center pa-8">
            <v-card color="error-container" class="pa-6" flat>
              <div class="d-flex align-center mb-2">
                <v-icon color="error" size="32" class="mr-3">mdi-alert-circle</v-icon>
                <div class="text-h6 text-on-error-container">读取失败</div>
              </div>
              <div class="text-body-1 text-on-error-container">{{ error }}</div>
            </v-card>
          </div>

          <!-- Empty State -->
          <div v-else-if="!filteredItems.length" class="empty-state">
            <v-icon size="64" color="surface-variant" class="mb-4">mdi-folder-open-outline</v-icon>
            <div class="text-h6 text-on-surface mb-2">暂无匹配条目</div>
            <div class="text-body-2 text-medium-emphasis">请前往设置页手动更新库，或调整筛选条件。</div>
          </div>

          <!-- Groups (Grid View) -->
          <div v-else class="groups px-6 pb-6">
            <div v-for="group in groupedItems" :key="group.name" class="group-section mb-8">
              <div class="group-header d-flex align-center mb-4">
                <div class="group-title text-h6 font-weight-bold mr-3">
                  {{ group.name }}
                </div>

                <v-divider class="group-divider opacity-20" />

                <v-chip size="small" variant="tonal" color="secondary" label class="ml-3 group-chip">
                  {{ group.items.length }}
                </v-chip>
              </div>

              <div class="anime-grid">
                <v-card v-for="item in group.items" :key="item.id" class="anime-card"
                  :class="{ selected: item.id === selectedId }" :variant="item.id === selectedId ? 'tonal' : 'elevated'"
                  :color="item.id === selectedId ? 'primary' : 'surface'" @click="emit('selectItem', item.id)"
                  @dblclick="emit('openDetail', item)">
                  <!-- Card Header / Banner -->
                  <div class="anime-card-header pa-4">
                    <div class="text-subtitle-1 font-weight-bold text-truncate mb-1 text-white">
                      {{ item.title }}
                    </div>
                    <div class="text-caption text-white opacity-80 text-truncate mb-3">
                      {{ item.folderName }}
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                      <v-chip v-if="item.episodes" size="x-small" color="white" variant="outlined">
                        {{ item.episodes }}
                      </v-chip>
                      <v-chip v-if="item.quality" size="x-small" color="white" variant="flat" class="text-primary">
                        {{ item.quality }}
                      </v-chip>
                    </div>
                  </div>

                  <!-- Card Body -->
                  <div class="pa-4">
                    <div class="d-flex flex-column gap-1 mb-3">
                      <div class="text-caption text-medium-emphasis d-flex align-center">
                        <v-icon size="14" start class="mr-2 opacity-60">mdi-account-group</v-icon>
                        <span class="text-truncate">{{ item.fansub || "未知字幕组" }}</span>
                      </div>
                      <div class="text-caption text-medium-emphasis d-flex align-center">
                        <v-icon size="14" start class="mr-2 opacity-60">mdi-subtitles</v-icon>
                        <span class="text-truncate">{{ item.subtitleType || "未知字幕" }}</span>
                      </div>
                      <div v-if="item.lastPlayedName" class="text-caption text-primary d-flex align-center mt-1">
                        <v-icon size="14" start class="mr-2">mdi-history</v-icon>
                        <span class="text-truncate">上次播放：{{ item.lastPlayedName }}</span>
                      </div>
                    </div>
                    <v-divider class="mb-2 opacity-20"></v-divider>
                    <div class="text-caption text-disabled text-truncate font-mono">
                      {{ item.relativeDir }}
                    </div>
                  </div>
                </v-card>
              </div>
            </div>
          </div>
        </v-main>

        <!-- Filter Sidebar using v-navigation-drawer -->
        <v-navigation-drawer v-model="internalShowFilters" location="right" floating :permanent="!isCompact"
          :temporary="isCompact" width="320" color="surface" class="border-s filter-drawer">
          <div class="pa-4 d-flex align-center justify-space-between">
            <div class="text-title-large font-weight-medium">筛选器</div>
            <v-btn v-if="isCompact" icon="mdi-close" variant="text" @click="emit('closeFilters')"></v-btn>
          </div>

          <div class="px-4 pb-4">
            <v-btn block :variant="!hasAnyFilter ? 'tonal' : 'text'" color="primary" class="mb-4"
              @click="emit('clearFilters')">
              显示全部
            </v-btn>

            <!-- Filters -->
            <div class="filter-group mb-6">
              <div class="text-label-large font-weight-medium mb-2 text-medium-emphasis">完结状态</div>
              <div class="d-flex flex-wrap gap-2">
                <v-chip v-for="option in statusOptions" :key="option.name" filter
                  :input-value="statusFilter.includes(option.name)"
                  :color="statusFilter.includes(option.name) ? 'primary' : undefined"
                  :variant="statusFilter.includes(option.name) ? 'tonal' : 'outlined'"
                  @click="emit('toggleStatus', option.name)">
                  {{ option.name }}
                  <span class="ml-1 opacity-60">({{ option.count }})</span>
                </v-chip>
              </div>
            </div>

            <div class="filter-group mb-6">
              <div class="text-label-large font-weight-medium mb-2 text-medium-emphasis">画质</div>
              <div class="d-flex flex-wrap gap-2">
                <v-chip v-for="option in qualityOptions" :key="option.name" filter
                  :input-value="qualityFilter.includes(option.name)"
                  :color="qualityFilter.includes(option.name) ? 'primary' : undefined"
                  :variant="qualityFilter.includes(option.name) ? 'tonal' : 'outlined'"
                  @click="emit('toggleQuality', option.name)">
                  {{ option.name }}
                  <span class="ml-1 opacity-60">({{ option.count }})</span>
                </v-chip>
              </div>
            </div>

            <div class="filter-group mb-6">
              <div class="text-label-large font-weight-medium mb-2 text-medium-emphasis">字幕组</div>
              <div class="d-flex flex-wrap gap-2">
                <v-chip v-for="option in fansubOptions" :key="option.name" filter size="small"
                  :input-value="fansubFilter.includes(option.name)"
                  :color="fansubFilter.includes(option.name) ? 'primary' : undefined"
                  :variant="fansubFilter.includes(option.name) ? 'tonal' : 'outlined'"
                  @click="emit('toggleFansub', option.name)">
                  {{ option.name }}
                </v-chip>
              </div>
            </div>

            <div class="filter-group">
              <div class="text-label-large font-weight-medium mb-2 text-medium-emphasis">字幕形式</div>
              <div class="d-flex flex-wrap gap-2">
                <v-chip v-for="option in subtitleOptions" :key="option.name" filter size="small"
                  :input-value="subtitleFilter.includes(option.name)"
                  :color="subtitleFilter.includes(option.name) ? 'primary' : undefined"
                  :variant="subtitleFilter.includes(option.name) ? 'tonal' : 'outlined'"
                  @click="emit('toggleSubtitle', option.name)">
                  {{ option.name }}
                </v-chip>
              </div>
            </div>
          </div>
        </v-navigation-drawer>
      </v-layout>

      <!-- Mobile Filter FAB -->
      <v-btn v-if="isCompact" icon="mdi-filter-variant" color="primary" position="fixed" location="bottom end"
        size="large" elevation="4" class="filter-fab" style="bottom: 24px; right: 24px; z-index: 1000;"
        @click="emit('toggleFilters')"></v-btn>
    </div>
  </section>
</template>

<style scoped>
.library-page {
  height: 100%;
}

.full-height {
  height: calc(100vh - 140px);
  /* Adjust based on header height */
}

.page-container {
  height: 100%;
  padding: 0;
  display: flex;
  flex-direction: column;
}

/* Header section padding */
.page-header {
  padding-left: 24px;
  padding-right: 24px;
  padding-top: 24px;
}

.controls-bar {
  margin-left: 16px;
  margin-right: 16px;
}

.anime-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.anime-card {
  transition: transform 0.2s, box-shadow 0.2s;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.anime-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12) !important;
}

.anime-card-header {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-secondary)));
  color: white;
}

.opacity-60 {
  opacity: 0.6;
}

.opacity-80 {
  opacity: 0.8;
}

.opacity-20 {
  opacity: 0.2;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgb(var(--v-theme-on-surface-variant));
  padding: 48px;
}

.stats-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-left: 24px;
}

.gap-2 {
  gap: 8px;
}

.group-header {
  min-width: 0;
  /* 关键：允许内部元素在 flex 下正确收缩/换行 */
  gap: 12px;
  /* 可选：统一间距（如果你不用 mr/ml 也行） */
  align-items: center;
}

.group-title {
  min-width: 0;
  /* 关键：否则标题可能不肯缩，导致 divider 被压扁 */
  flex: 0 1 auto;
  /* 标题优先占空间 */
  white-space: normal;
  /* 允许换行 */
  overflow-wrap: anywhere;
  /* 超长字符串也能断行（可选但很稳） */
}

/* divider 作为一个“可伸缩”的 flex item：保底 20px */
.group-divider {
  flex: 1 1 auto;
  /* 可被挤压，但不主动抢空间 */
  min-width: 100px;
  align-self: center;
}

.group-chip {
  flex: 0 0 auto;
  /* chip 不被压缩 */
}

/* 让 v-layout 在 page-container 里吃满剩余高度 */
.library-layout {
  flex: 1;
  min-height: 0;
  /* 关键：允许子元素产生滚动 */
  display: flex;
  gap: 0;
}

/* 主资源区：负责滚动 */
.library-content {
  min-height: 0;
  /* 关键：没有它就滚不出来 */
  overflow-y: auto;
  /* 主滚动条出现 */
}

.filter-drawer {
  top: 16px !important;
  right: 16px !important;
  bottom: 16px !important;

  height: auto !important;
  /* 用 top+bottom 控高度 */
  border-radius: 16px !important;
  /* 悬浮卡片圆角 */
  overflow: hidden;
  /* 圆角下裁切内容 */
  box-shadow: 0 10px 30px rgba(0, 0, 0, .18) !important;
  /* 可选：更像悬浮 */
}

/* 右侧 drawer 在“未激活/关闭”时，多推出去 16px，抵消 right:16px 造成的露边 */
.filter-drawer:not(.v-navigation-drawer--active) {
  transform: translateX(calc(100% + 16px)) !important;
}


/* 让抽屉“里面”滚动，而不是外壳滚动 */
.filter-drawer .v-navigation-drawer__content {
  height: 100%;
  overflow-y: auto;
}
</style>
