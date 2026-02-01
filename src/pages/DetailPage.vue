<script setup lang="ts">
import type { FileEntry, LibraryEntry } from "../types";
import { computed } from "vue";

type Breadcrumb = { label: string; path: string };

const props = defineProps<{
  active: boolean;
  selected: LibraryEntry | null;
  dirEntries: FileEntry[];
  dirLoading: boolean;
  dirError: string;
  breadcrumbs: Breadcrumb[];
  currentDir: string;
  rootDir: string;
  formatSize: (size?: number) => string;
  formatDate: (timestamp?: number) => string;
  isVideoFile: (entry: FileEntry) => boolean;
}>();

const emit = defineEmits<{
  (event: "openFolder", path: string): void;
  (event: "openEntry", entry: FileEntry): void;
  (event: "playLast"): void;
  (event: "navigateBreadcrumb", path: string): void;
}>();

const totalSize = computed(() => {
  if (!props.dirEntries || !props.dirEntries.length) return 0;
  return props.dirEntries.reduce((acc, entry) => acc + (entry.size || 0), 0);
});
</script>

<template>
  <section class="page detail-page" :class="{ active: active }" :aria-hidden="!active">
    <div class="page-container">
      <!-- Header -->
      <v-card class="detail-header md-card mb-6">
        <div class="d-flex justify-space-between align-start flex-wrap gap-4">
          <div>
            <!-- Breadcrumbs -->
            <v-breadcrumbs density="compact" class="pa-0 mb-2">
              <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
                <v-breadcrumbs-item
                  :disabled="index === breadcrumbs.length - 1"
                  @click="index !== breadcrumbs.length - 1 && emit('navigateBreadcrumb', crumb.path)"
                >
                  {{ crumb.label }}
                </v-breadcrumbs-item>
                <v-breadcrumbs-divider v-if="index < breadcrumbs.length - 1">
                  <v-icon size="16" class="text-medium-emphasis">mdi-chevron-right</v-icon>
                </v-breadcrumbs-divider>
              </template>
            </v-breadcrumbs>
            <h2 class="text-h5 font-weight-medium mb-1">{{ selected?.title || "详情" }}</h2>
            <p class="text-body-2 text-medium-emphasis">双击条目用系统默认播放器播放。</p>
          </div>
          <v-btn
            variant="outlined"
            prepend-icon="mdi-folder-open"
            @click="emit('openFolder', currentDir || rootDir)"
          >
            打开文件夹
          </v-btn>
        </div>
      </v-card>

      <!-- Body -->
      <div class="detail-body">
        <!-- Sidebar -->
        <aside class="detail-sidebar">
          <!-- Info Card -->
          <v-card class="md-card mb-５">
            <v-card-title class="text-subtitle-1 font-weight-medium">本地信息</v-card-title>
            <v-card-text>
              <v-list density="compact" class="bg-transparent">
                <v-list-item>
                  <template #prepend>
                    <span class="text-caption text-medium-emphasis" style="width: 80px">文件夹大小</span>
                  </template>
                  <v-list-item-title class="font-weight-medium">{{ formatSize(totalSize) }}</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <span class="text-caption text-medium-emphasis" style="width: 80px">字幕组</span>
                  </template>
                  <v-list-item-title>{{ selected?.fansub || "-" }}</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <span class="text-caption text-medium-emphasis" style="width: 80px">字幕形式</span>
                  </template>
                  <v-list-item-title>{{ selected?.subtitleType || "-" }}</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <span class="text-caption text-medium-emphasis" style="width: 80px">集数</span>
                  </template>
                  <v-list-item-title>{{ selected?.episodes || "-" }}</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <span class="text-caption text-medium-emphasis" style="width: 80px">画质</span>
                  </template>
                  <v-list-item-title>{{ selected?.quality || "-" }}</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <span class="text-caption text-medium-emphasis" style="width: 80px">备注</span>
                  </template>
                  <v-list-item-title>{{ selected?.note || "-" }}</v-list-item-title>
                </v-list-item>
              </v-list>
              <v-divider class="my-2" />
              <div class="text-caption text-medium-emphasis">路径</div>
              <div class="text-body-2" style="word-break: break-all">{{ selected?.path || "-" }}</div>
            </v-card-text>
          </v-card>

          <!-- Last Played Card -->
          <v-card class="md-card">
            <v-card-title class="text-subtitle-1 font-weight-medium">最近播放</v-card-title>
            <v-card-text>
              <div class="font-weight-medium mb-1">
                {{ selected?.lastPlayedName || "暂无播放记录" }}
              </div>
              <div class="text-caption text-medium-emphasis mb-4">
                {{ formatDate(selected?.lastPlayedAt) }}
              </div>
              <v-btn
                color="primary"
                :disabled="!selected?.lastPlayedPath"
                prepend-icon="mdi-play"
                @click="emit('playLast')"
              >
                使用系统播放器
              </v-btn>
            </v-card-text>
          </v-card>
        </aside>

        <!-- Content -->
        <main class="detail-content">
          <v-card class="md-card">
            <v-card-title class="text-subtitle-1 font-weight-medium">资源一览</v-card-title>
            <v-card-text>
              <!-- Loading -->
              <div v-if="dirLoading" class="loading-state">
                <v-progress-circular indeterminate color="primary" />
                <span class="ml-3">读取目录中...</span>
              </div>

              <!-- Error -->
              <v-alert v-else-if="dirError" type="error" variant="tonal">
                {{ dirError }}
              </v-alert>

              <!-- File Grid -->
              <div v-else class="file-grid">
                <v-card
                  v-for="entry in dirEntries"
                  :key="entry.path"
                  :class="['file-card', { 'manifest-card': entry.hasManifest }]"
                  variant="outlined"
                  @dblclick="emit('openEntry', entry)"
                >
                  <!-- Manifest Card -->
                  <template v-if="entry.hasManifest">
                    <div class="manifest-header">
                      <div class="font-weight-medium">{{ entry.manifestTitle || entry.name }}</div>
                      <div class="text-caption text-medium-emphasis" v-if="entry.name !== entry.manifestTitle">
                        {{ entry.name }}
                      </div>
                      <div class="d-flex gap-2 mt-2 flex-wrap">
                        <v-chip v-if="entry.manifestQuality" size="x-small" color="primary">
                          {{ entry.manifestQuality }}
                        </v-chip>
                        <v-chip v-if="entry.manifestEpisodes" size="x-small" variant="outlined">
                          {{ entry.manifestEpisodes }}
                        </v-chip>
                      </div>
                    </div>
                    <v-card-text class="pt-2">
                      <div class="text-caption text-medium-emphasis d-flex flex-column gap-1">
                        <span v-if="entry.manifestFansub">字幕组：{{ entry.manifestFansub }}</span>
                        <span v-if="entry.manifestSubtitleType">字幕：{{ entry.manifestSubtitleType }}</span>
                        <span v-if="entry.manifestNote">{{ entry.manifestNote }}</span>
                        <span v-if="entry.size">文件夹大小：{{ formatSize(entry.size) }}</span>
                      </div>
                    </v-card-text>
                  </template>

                  <!-- Regular File/Folder -->
                  <template v-else>
                    <v-card-text class="d-flex flex-column gap-2">
                      <div class="file-icon-wrapper" :class="{ folder: entry.isDir, video: isVideoFile(entry) }">
                        <v-icon v-if="entry.isDir" size="24">mdi-folder</v-icon>
                        <v-icon v-else-if="isVideoFile(entry)" size="24">mdi-movie</v-icon>
                        <v-icon v-else size="24">mdi-file-document</v-icon>
                      </div>
                      <div class="file-name">{{ entry.name }}</div>
                      <div class="file-meta text-caption text-medium-emphasis">
                        <span>{{ entry.isDir ? "文件夹" : formatSize(entry.size) }}</span>
                        <span v-if="!entry.isDir">{{ entry.extension || "文件" }}</span>
                      </div>
                    </v-card-text>
                  </template>
                </v-card>
              </div>
            </v-card-text>
          </v-card>
        </main>
      </div>
    </div>
  </section>
</template>

<style scoped>
.detail-page {
  height: 100%;
  overflow: hidden;
}

.page-container {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
}

.detail-header {
  padding: 20px;
}

.detail-body {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 24px;
}

@media (max-width: 900px) {
  .detail-body {
    grid-template-columns: 1fr;
  }
}

.detail-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-content {
  min-width: 0;
}

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.file-card {
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.file-card:hover {
  border-color: rgb(var(--v-theme-primary));
  transform: translateY(-2px);
}

.manifest-card {
  overflow: hidden;
}

.manifest-header {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-secondary)));
  color: white;
  padding: 12px;
}

.file-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft);
  color: var(--accent);
}

.file-icon-wrapper.folder {
  background: rgba(255, 183, 77, 0.2);
  color: #FFB74D;
}

.file-icon-wrapper.video {
  background: rgba(66, 165, 245, 0.2);
  color: #42A5F5;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  word-break: break-word;
}

.file-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.gap-2 {
  gap: 8px;
}
</style>
