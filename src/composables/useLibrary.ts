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

  const chineseDigit = (char: string) => {
    const map: Record<string, number> = {
      零: 0,
      一: 1,
      二: 2,
      两: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
      七: 7,
      八: 8,
      九: 9,
    };
    return map[char];
  };

  const parseChineseNumber = (text: string) => {
    if (!text) return Number.NaN;
    if (/^\d+$/.test(text)) return Number.parseInt(text, 10);
    if (text === "十") return 10;
    const tenIndex = text.indexOf("十");
    if (tenIndex >= 0) {
      const left = text.slice(0, tenIndex);
      const right = text.slice(tenIndex + 1);
      const tens = left ? chineseDigit(left) : 1;
      const ones = right ? chineseDigit(right) : 0;
      if (Number.isFinite(tens) && Number.isFinite(ones)) {
        return tens * 10 + ones;
      }
    }
    if (text.length === 1) {
      const single = chineseDigit(text);
      if (Number.isFinite(single)) return single;
    }
    return Number.NaN;
  };

  const seasonMeta = (title: string) => {
    const trimmed = (title || "").trim();
    const seasonMatch =
      trimmed.match(/^(.*?)[\s\-_:：]*第([零一二两三四五六七八九十\d]+)\s*(季|期|部)\s*$/) ??
      trimmed.match(/^(.*?)[\s\-_:：]*(?:S|Season)\s*([0-9]+)\s*$/i);
    if (!seasonMatch) {
      return { base: trimmed, season: Number.NaN };
    }
    const base = seasonMatch[1]?.trim() || trimmed;
    const seasonRaw = seasonMatch[2]?.trim() || "";
    const season = parseChineseNumber(seasonRaw);
    return { base, season };
  };

  const sortByTitle = (a: LibraryEntry, b: LibraryEntry) => {
    const am = seasonMeta(a.title);
    const bm = seasonMeta(b.title);

    const baseOrder = am.base.localeCompare(bm.base, "zh");
    if (baseOrder !== 0) return baseOrder;

    const aSeason = Number.isFinite(am.season);
    const bSeason = Number.isFinite(bm.season);
    if (aSeason && bSeason && am.season !== bm.season) {
      return am.season - bm.season;
    }
    if (aSeason !== bSeason) {
      return aSeason ? -1 : 1;
    }
    return a.title.localeCompare(b.title, "zh");
  };

  const splitMulti = (value?: string) => {
    if (!value) return [];
    return value
      .split(/[，,\/|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const isCompleted = (item: LibraryEntry) => item.episodes > 0;

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
        `${item.episodes}`,
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
        items: groupItems.sort(sortByTitle),
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
      setSelectedId((prev) => {
        if (prev && results.some((item) => item.id === prev)) {
          return prev;
        }
        return results[0]?.id ?? null;
      });
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
      setSelectedId((prev) => {
        if (prev && results.some((item) => item.id === prev)) {
          return prev;
        }
        return results[0]?.id ?? null;
      });
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
