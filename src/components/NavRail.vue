<script setup lang="ts">
defineProps<{
  collapsed: boolean;
  selection: "library" | "settings";
}>();

const emit = defineEmits<{
  (event: "toggle"): void;
  (event: "select", value: "library" | "settings"): void;
}>();
</script>

<template>
  <v-navigation-drawer
    :rail="collapsed"
    permanent
    :width="240"
    rail-width="80"
    color="surface"
  >
    <div class="nav-brand">
      <div class="brand-icon">AM</div>
      <div class="brand-text" v-if="!collapsed">
        <div class="brand-title">Anime Manager</div>
        <div class="brand-sub">Material 3 · Vue</div>
      </div>
    </div>

    <v-divider class="my-2" />

    <v-list density="compact" nav>
      <v-list-item
        :prepend-icon="collapsed ? 'mdi-bookshelf' : undefined"
        :active="selection === 'library'"
        color="primary"
        rounded="lg"
        @click="emit('select', 'library')"
      >
        <template #prepend v-if="!collapsed">
          <v-icon>mdi-bookshelf</v-icon>
        </template>
        <v-list-item-title v-if="!collapsed">资源库</v-list-item-title>
      </v-list-item>

      <v-list-item
        :prepend-icon="collapsed ? 'mdi-cog' : undefined"
        :active="selection === 'settings'"
        color="primary"
        rounded="lg"
        @click="emit('select', 'settings')"
      >
        <template #prepend v-if="!collapsed">
          <v-icon>mdi-cog</v-icon>
        </template>
        <v-list-item-title v-if="!collapsed">设置</v-list-item-title>
      </v-list-item>
    </v-list>

    <template #append>
      <v-divider />
      <v-list density="compact" nav>
        <v-list-item
          :prepend-icon="collapsed ? 'mdi-chevron-right' : 'mdi-chevron-left'"
          rounded="lg"
          @click="emit('toggle')"
        >
          <v-list-item-title v-if="!collapsed">
            {{ collapsed ? "展开" : "收起" }}
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<style scoped>
.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-secondary)));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.brand-title {
  font-weight: 600;
  font-size: 15px;
}

.brand-sub {
  font-size: 12px;
  opacity: 0.6;
}
</style>
