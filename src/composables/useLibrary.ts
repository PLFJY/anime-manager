import { useCallback, useEffect, useMemo, useState } from "react";
import { loadLibrary, refreshLibrary } from "../services/library";
import type { LibraryEntry } from "../types";

export const useLibrary = (baseDir: string) => {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"load" | "refresh" | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [fansubFilter, setFansubFilter] = useState<string[]>([]);
  const [subtitleFilter, setSubtitleFilter] = useState<string[]>([]);
  const [qualityFilter, setQualityFilter] = useState<string[]>([]);

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

  const statusOptions = useMemo(() => {
    let finished = 0;
    let ongoing = 0;
    for (const item of items) {
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
  }, [items]);

  const fansubOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const entries = splitMulti(item.fansub);
      if (!entries.length) continue;
      for (const entry of entries) {
        counts.set(entry, (counts.get(entry) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b, "zh"))
      .map(([name, count]) => ({ name, count }));
  }, [items]);

  const subtitleOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (!item.subtitleType) continue;
      counts.set(item.subtitleType, (counts.get(item.subtitleType) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b, "zh"))
      .map(([name, count]) => ({ name, count }));
  }, [items]);

  const qualityOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (!item.quality) continue;
      counts.set(item.quality, (counts.get(item.quality) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b, "zh"))
      .map(([name, count]) => ({ name, count }));
  }, [items]);

  const hasAnyFilter = useMemo(
    () =>
      statusFilter.length > 0 ||
      fansubFilter.length > 0 ||
      subtitleFilter.length > 0 ||
      qualityFilter.length > 0,
    [statusFilter, fansubFilter, subtitleFilter, qualityFilter]
  );

  const toggleSelection = useCallback((list: string[], value: string) => {
    if (list.includes(value)) {
      return list.filter((item) => item !== value);
    }
    return [...list, value];
  }, []);

  const toggleStatus = (value: string) =>
    setStatusFilter((prev) => toggleSelection(prev, value));
  const toggleFansub = (value: string) =>
    setFansubFilter((prev) => toggleSelection(prev, value));
  const toggleSubtitle = (value: string) =>
    setSubtitleFilter((prev) => toggleSelection(prev, value));
  const toggleQuality = (value: string) =>
    setQualityFilter((prev) => toggleSelection(prev, value));

  const clearAllFilters = () => {
    setStatusFilter([]);
    setFansubFilter([]);
    setSubtitleFilter([]);
    setQualityFilter([]);
  };

  const filteredItems = useMemo(() => {
    const keyword = normalized(search.trim());
    return items.filter((item) => {
      const matchesStatus = !statusFilter.length
        ? true
        : statusFilter.some((value) =>
            value === "已完结" ? isCompleted(item) : !isCompleted(item)
          );
      if (!matchesStatus) return false;
      if (
        fansubFilter.length &&
        !splitMulti(item.fansub).some((value) => fansubFilter.includes(value))
      ) {
        return false;
      }
      if (subtitleFilter.length && !subtitleFilter.includes(item.subtitleType)) {
        return false;
      }
      if (qualityFilter.length && !qualityFilter.includes(item.quality)) {
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
  }, [search, items, statusFilter, fansubFilter, subtitleFilter, qualityFilter]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, LibraryEntry[]>();
    for (const item of filteredItems) {
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
  }, [filteredItems]);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  useEffect(() => {
    const list = filteredItems;
    if (!list.length) {
      setSelectedId(null);
      return;
    }
    if (!list.some((item) => item.id === selectedId)) {
      setSelectedId(list[0].id);
    }
  }, [filteredItems, selectedId]);

  const loadLibraryEntries = useCallback(async () => {
    setLoadingAction("load");
    setLoading(true);
    setError("");
    try {
      const results = await loadLibrary(baseDir.trim());
      setItems(results);
      setSelectedId(results[0]?.id ?? null);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return [];
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  }, [baseDir]);

  const refreshLibraryEntries = useCallback(async () => {
    setLoadingAction("refresh");
    setLoading(true);
    setError("");
    try {
      const results = await refreshLibrary(baseDir.trim());
      setItems(results);
      setSelectedId(results[0]?.id ?? null);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return [];
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  }, [baseDir]);

  return {
    search,
    setSearch,
    items,
    setItems,
    loading,
    loadingAction,
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
