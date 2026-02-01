<script setup lang="ts">
import type { ThemeMode } from "../composables/useSettings";

defineProps<{
  active: boolean;
  baseDir: string;
  themeMode: ThemeMode;
  accentColor: string;
  autoRefresh: boolean;
  autoRefreshMinutes: number;
  loading: boolean;
}>();

const emit = defineEmits<{
  (event: "update:baseDir", value: string): void;
  (event: "update:themeMode", value: ThemeMode): void;
  (event: "update:accentColor", value: string): void;
  (event: "update:autoRefresh", value: boolean): void;
  (event: "update:autoRefreshMinutes", value: number): void;
  (event: "refresh"): void;
  (event: "load"): void;
}>();

const themeModeOptions = [
  { title: "跟随系统", value: "system" },
  { title: "浅色", value: "light" },
  { title: "深色", value: "dark" },
];
</script>

<template>
  <section
    class="page settings-page"
    :class="{ active: active }"
    :aria-hidden="!active"
  >
    <div class="page-container">
      <header class="page-header">
        <h1>设置</h1>
        <p class="subtitle">管理库目录、主题和更新策略。</p>
      </header>

      <div class="settings-grid">
        <!-- 库目录 -->
        <v-card class="settings-card md-card">
          <v-card-title class="settings-card-title">库目录</v-card-title>
          <v-card-text>
            <v-text-field
              variant="filled"
              label="库目录路径"
              placeholder="例如：F:\Videos"
              :model-value="baseDir"
              @update:model-value="emit('update:baseDir', $event)"
              prepend-inner-icon="mdi-folder"
              rounded="lg"
              density="comfortable"
            />
            <div class="d-flex gap-2 mt-4">
              <v-btn
                color="primary"
                :loading="loading"
                @click="emit('refresh')"
                prepend-icon="mdi-refresh"
              >
                手动更新库
              </v-btn>
              <v-btn
                variant="outlined"
                :loading="loading"
                @click="emit('load')"
                prepend-icon="mdi-database"
              >
                读取缓存
              </v-btn>
            </div>
            <p class="text-caption mt-4 text-medium-emphasis">
              缓存数据库存放在库目录下的 anime-manager.sqlite。
            </p>
          </v-card-text>
        </v-card>

        <!-- 主题与色彩 -->
        <v-card class="settings-card md-card">
          <v-card-title class="settings-card-title">主题与色彩</v-card-title>
          <v-card-text>
            <v-select
              variant="filled"
              label="深浅模式"
              :items="themeModeOptions"
              item-title="title"
              item-value="value"
              :model-value="themeMode"
              @update:model-value="emit('update:themeMode', $event)"
              prepend-inner-icon="mdi-theme-light-dark"
              rounded="lg"
              density="comfortable"
            />

            <div class="d-flex align-center gap-3 mt-4">
              <v-label>强调色</v-label>
              <input
                type="color"
                class="accent-picker"
                :value="accentColor"
                @input="emit('update:accentColor', ($event.target as HTMLInputElement).value)"
              />
              <v-text-field
                variant="filled"
                :model-value="accentColor"
                @update:model-value="emit('update:accentColor', $event)"
                hide-details
                rounded="lg"
                density="compact"
                style="max-width: 120px"
              />
            </div>
          </v-card-text>
        </v-card>

        <!-- 更新策略 -->
        <v-card class="settings-card md-card">
          <v-card-title class="settings-card-title">更新策略</v-card-title>
          <v-card-text>
            <v-switch
              color="primary"
              :model-value="autoRefresh"
              @update:model-value="emit('update:autoRefresh', $event)"
              inset
              hide-details
            >
              <template #label>
                <div>
                  <div class="font-weight-medium">启动时自动更新</div>
                  <div class="text-caption text-medium-emphasis">
                    打开后每次启动会刷新库存。
                  </div>
                </div>
              </template>
            </v-switch>

            <v-text-field
              variant="filled"
              label="更新间隔（分钟）"
              type="number"
              min="5"
              max="720"
              :model-value="autoRefreshMinutes"
              @update:model-value="emit('update:autoRefreshMinutes', Number($event || 0))"
              prepend-inner-icon="mdi-timer"
              rounded="lg"
              density="comfortable"
              class="mt-4"
              style="max-width: 200px"
            />

            <p class="text-caption mt-4 text-medium-emphasis">
              当前版本仅保存设置，不执行定时任务。
            </p>
          </v-card-text>
        </v-card>
      </div>
    </div>
  </section>
</template>

<style scoped>
.settings-page {
  height: 100%;
  overflow: hidden;
}

.page-container {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 16px;
}

.settings-card {
  padding: 8px;
}

.accent-picker {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  padding: 0;
}

.accent-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.accent-picker::-webkit-color-swatch {
  border: none;
  border-radius: 8px;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}
</style>
