import { computed, ref, watch, type Ref } from "vue";
import { loadLibrary, refreshLibrary } from "../services/library";
import type { LibraryEntry } from "../types";

export const useLibrary = (baseDir: Ref<string>) => {
  const search = ref("");
  const items = ref<LibraryEntry[]>([]);
  const loading = ref(false);
  const error = ref("");
  const selectedId = ref<string | null>(null);

  const statusFilter = ref<string[]>([]);
  const fansubFilter = ref<string[]>([]);
  const subtitleFilter = ref<string[]>([]);
  const qualityFilter = ref<string[]>([]);

  const normalized = (value: string) => value.toLowerCase().replace(/\s+/g, "");

  const splitMulti = (value?: string) => {
    if (!value) return [];
    return value
      .split(/[，,\/|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const isCompleted = (item: LibraryEntry) => {
    const text = `${item.episodes ?? ""}`;
    if (/未完|连载|更新中/i.test(text)) return false;
    return true;
  };

  const statusOptions = computed(() => {
    let finished = 0;
    let ongoing = 0;
    for (const item of items.value) {
      if (isCompleted(item)) {
        finished += 1;
      } else {
        ongoing += 1;
      }
    }
    return [
      { name: "已完结", count: finished },
      { name: "未完结", count: ongoing },
    ];
  });

  const fansubOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const item of items.value) {
      const entries = splitMulti(item.fansub);
      if (!entries.length) continue;
      for (const entry of entries) {
        counts.set(entry, (counts.get(entry) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b, "zh"))
      .map(([name, count]) => ({ name, count }));
  });

  const subtitleOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const item of items.value) {
      if (!item.subtitleType) continue;
      counts.set(item.subtitleType, (counts.get(item.subtitleType) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b, "zh"))
      .map(([name, count]) => ({ name, count }));
  });

  const qualityOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const item of items.value) {
      if (!item.quality) continue;
      counts.set(item.quality, (counts.get(item.quality) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b, "zh"))
      .map(([name, count]) => ({ name, count }));
  });

  const hasAnyFilter = computed(
    () =>
      statusFilter.value.length ||
      fansubFilter.value.length ||
      subtitleFilter.value.length ||
      qualityFilter.value.length
  );

  const toggleSelection = (target: { value: string[] }, value: string) => {
    if (target.value.includes(value)) {
      target.value = target.value.filter((item) => item !== value);
    } else {
      target.value = [...target.value, value];
    }
  };

  const toggleStatus = (value: string) => toggleSelection(statusFilter, value);
  const toggleFansub = (value: string) => toggleSelection(fansubFilter, value);
  const toggleSubtitle = (value: string) =>
    toggleSelection(subtitleFilter, value);
  const toggleQuality = (value: string) => toggleSelection(qualityFilter, value);

  const clearAllFilters = () => {
    statusFilter.value = [];
    fansubFilter.value = [];
    subtitleFilter.value = [];
    qualityFilter.value = [];
  };

  const filteredItems = computed(() => {
    const keyword = normalized(search.value.trim());
    return items.value.filter((item) => {
      const matchesStatus = !statusFilter.value.length
        ? true
        : statusFilter.value.some((value) =>
            value === "已完结" ? isCompleted(item) : !isCompleted(item)
          );
      if (!matchesStatus) return false;
      if (
        fansubFilter.value.length &&
        !splitMulti(item.fansub).some((value) =>
          fansubFilter.value.includes(value)
        )
      ) {
        return false;
      }
      if (
        subtitleFilter.value.length &&
        !subtitleFilter.value.includes(item.subtitleType)
      ) {
        return false;
      }
      if (qualityFilter.value.length && !qualityFilter.value.includes(item.quality)) {
        return false;
      }
      if (!keyword) return true;
      return [
        item.title,
        item.fansub,
        item.subtitleType,
        item.quality,
        item.note,
        item.group,
        item.folderName,
        item.lastPlayedName,
      ]
        .filter(Boolean)
        .some((value) => normalized(value).includes(keyword));
    });
  });

  const groupedItems = computed(() => {
    const groups = new Map<string, LibraryEntry[]>();
    for (const item of filteredItems.value) {
      if (!groups.has(item.group)) {
        groups.set(item.group, []);
      }
      groups.get(item.group)?.push(item);
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b, "zh"))
      .map(([name, groupItems]) => ({
        name,
        items: groupItems.sort((a, b) => a.title.localeCompare(b.title, "zh")),
      }));
  });

  const selected = computed(() => {
    return items.value.find((item) => item.id === selectedId.value) ?? null;
  });

  watch(filteredItems, (list) => {
    if (!list.length) {
      selectedId.value = null;
      return;
    }
    if (!list.some((item) => item.id === selectedId.value)) {
      selectedId.value = list[0].id;
    }
  });

  const loadLibraryEntries = async () => {
    loading.value = true;
    error.value = "";
    try {
      const results = await loadLibrary(baseDir.value.trim());
      items.value = results;
      selectedId.value = results[0]?.id ?? null;
      return results;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      return [];
    } finally {
      loading.value = false;
    }
  };

  const refreshLibraryEntries = async () => {
    loading.value = true;
    error.value = "";
    try {
      const results = await refreshLibrary(baseDir.value.trim());
      items.value = results;
      selectedId.value = results[0]?.id ?? null;
      return results;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      return [];
    } finally {
      loading.value = false;
    }
  };

  return {
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
  };
};
