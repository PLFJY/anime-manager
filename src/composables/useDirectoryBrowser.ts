import { computed, ref, type ComputedRef, type Ref } from "vue";
import {
  listDirectory,
  openInExplorer,
  openPath,
  updatePlayHistory,
} from "../services/library";
import type { FileEntry, LibraryEntry } from "../types";
import type { PageName } from "./useLayout";

interface DirectoryDeps {
  baseDir: Ref<string>;
  items: Ref<LibraryEntry[]>;
  selected: ComputedRef<LibraryEntry | null>;
  selectedId: Ref<string | null>;
  page: Ref<PageName>;
}

export const useDirectoryBrowser = ({
  baseDir,
  items,
  selected,
  selectedId,
  page,
}: DirectoryDeps) => {
  const dirEntries = ref<FileEntry[]>([]);
  const dirLoading = ref(false);
  const dirError = ref("");
  const currentDir = ref("");
  const rootDir = ref("");

  const dirCache = new Map<string, FileEntry[]>();
  let dirRequestId = 0;

  const formatSize = (size?: number) => {
    if (!size) return "-";
    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "-";
    const date = new Date(timestamp * 1000);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const isVideoFile = (entry: FileEntry) => {
    const ext = entry.extension.toLowerCase();
    return ["mp4", "mkv", "webm", "avi", "m4v"].includes(ext);
  };

  const sortDirectoryEntries = (entries: FileEntry[]) => {
    return [...entries].sort((a, b) => {
      if (a.hasManifest !== b.hasManifest) {
        return a.hasManifest ? -1 : 1;
      }
      if (a.isDir !== b.isDir) {
        return a.isDir ? -1 : 1;
      }
      return a.name.localeCompare(b.name, "zh");
    });
  };

  const loadDirectoryEntries = async (path: string) => {
    const requestId = ++dirRequestId;
    dirLoading.value = true;
    dirError.value = "";
    try {
      const entries = await listDirectory(path);
      if (requestId !== dirRequestId) return;
      const filtered = entries.filter(
        (entry) => entry.name.toLowerCase() !== "manifest.yml"
      );
      const sorted = sortDirectoryEntries(filtered);
      dirEntries.value = sorted;
      dirCache.set(path, sorted);
    } catch (err) {
      if (requestId !== dirRequestId) return;
      dirError.value = err instanceof Error ? err.message : String(err);
    } finally {
      if (requestId === dirRequestId) {
        dirLoading.value = false;
      }
    }
  };

  const openDetail = (item: LibraryEntry) => {
    selectedId.value = item.id;
    rootDir.value = item.path;
    currentDir.value = item.path;
    page.value = "detail";
    const cached = dirCache.get(item.path);
    dirEntries.value = cached ? [...cached] : [];
    loadDirectoryEntries(item.path);
  };

  const openFolder = async (path: string) => {
    try {
      await openInExplorer(path);
    } catch (err) {
      dirError.value = err instanceof Error ? err.message : String(err);
    }
  };

  const openEntry = async (entry: FileEntry) => {
    if (entry.isDir) {
      currentDir.value = entry.path;
      const cached = dirCache.get(entry.path);
      dirEntries.value = cached ? [...cached] : [];
      await loadDirectoryEntries(entry.path);
      return;
    }

    await openPath(entry.path);

    if (isVideoFile(entry) && selected.value) {
      const now = Math.floor(Date.now() / 1000);
      const entryId = selected.value.id;
      const base = baseDir.value.trim();
      updatePlayHistory(base, entryId, entry.path, entry.name).catch(() => {
        return;
      });
      const index = items.value.findIndex((item) => item.id === entryId);
      if (index >= 0) {
        const updated = { ...items.value[index] };
        updated.lastPlayedPath = entry.path;
        updated.lastPlayedName = entry.name;
        updated.lastPlayedAt = now;
        items.value.splice(index, 1, updated);
      }
    }
  };

  const playLast = async () => {
    if (!selected.value?.lastPlayedPath) return;
    await openPath(selected.value.lastPlayedPath);
  };

  const buildBreadcrumbs = () => {
    if (!rootDir.value) return [];
    const root = rootDir.value;
    const current = currentDir.value || root;
    const normalize = (value: string) =>
      value.replace(/[/\\]+/g, "/").replace(/\/$/, "");
    const rootNorm = normalize(root);
    const currentNorm = normalize(current);
    const rootLabel = rootNorm.split("/").filter(Boolean).pop() ?? rootNorm;
    let relative = currentNorm.startsWith(rootNorm)
      ? currentNorm.slice(rootNorm.length)
      : "";
    relative = relative.replace(/^\/+/, "");
    const relParts = relative ? relative.split("/").filter(Boolean) : [];
    const sep = root.includes("\\") ? "\\" : "/";
    const joinPath = (base: string, parts: string[]) => {
      const clean = base.replace(/[/\\]+$/, "");
      return parts.length ? `${clean}${sep}${parts.join(sep)}` : clean;
    };
    const crumbs = [
      { label: "主页", path: "home" },
      { label: rootLabel, path: root },
    ];
    const acc: string[] = [];
    relParts.forEach((part) => {
      acc.push(part);
      crumbs.push({ label: part, path: joinPath(root, acc) });
    });
    return crumbs;
  };

  const breadcrumbs = computed(() => buildBreadcrumbs());

  const navigateBreadcrumb = (path: string) => {
    if (path === "home") {
      page.value = "library";
      return;
    }
    currentDir.value = path;
    const cached = dirCache.get(path);
    dirEntries.value = cached ? [...cached] : [];
    loadDirectoryEntries(path);
  };

  return {
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
  };
};
