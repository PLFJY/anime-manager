import { useCallback, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  listDirectory,
  openInExplorer,
  openPath,
  updatePlayHistory,
} from "../services/library";
import type { FileEntry, LibraryEntry } from "../types";
import type { PageName } from "./useLayout";

interface DirectoryDeps {
  baseDir: string;
  items: LibraryEntry[];
  setItems: Dispatch<SetStateAction<LibraryEntry[]>>;
  selected: LibraryEntry | null;
  setSelectedId: (value: string | null) => void;
  setPage: (value: PageName) => void;
}

export const useDirectoryBrowser = ({
  baseDir,
  items,
  setItems,
  selected,
  setSelectedId,
  setPage,
}: DirectoryDeps) => {
  const [dirEntries, setDirEntries] = useState<FileEntry[]>([]);
  const [dirLoading, setDirLoading] = useState(false);
  const [dirError, setDirError] = useState("");
  const [currentDir, setCurrentDir] = useState("");
  const [rootDir, setRootDir] = useState("");

  const dirCache = useRef(new Map<string, FileEntry[]>());
  const dirRequestId = useRef(0);

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

  const isAudioFile = (entry: FileEntry) => {
    const ext = entry.extension.toLowerCase();
    return ["mp3", "flac", "m4a", "aac", "wav", "ogg", "opus"].includes(ext);
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
    const requestId = ++dirRequestId.current;
    setDirLoading(true);
    setDirError("");
    try {
      const entries = await listDirectory(path);
      if (requestId !== dirRequestId.current) return;
      const filtered = entries.filter(
        (entry) => entry.name.toLowerCase() !== "manifest.yml"
      );
      const mediaOnly = filtered.filter(
        (entry) => entry.isDir || isVideoFile(entry) || isAudioFile(entry)
      );
      const sorted = sortDirectoryEntries(mediaOnly);
      setDirEntries(sorted);
      dirCache.current.set(path, sorted);
    } catch (err) {
      if (requestId !== dirRequestId.current) return;
      setDirError(err instanceof Error ? err.message : String(err));
    } finally {
      if (requestId === dirRequestId.current) {
        setDirLoading(false);
      }
    }
  };

  const openDetail = (item: LibraryEntry) => {
    setSelectedId(item.id);
    setRootDir(item.path);
    setCurrentDir(item.path);
    setPage("detail");
    const cached = dirCache.current.get(item.path);
    setDirEntries(cached ? [...cached] : []);
    loadDirectoryEntries(item.path);
  };

  const openFolder = async (path: string) => {
    try {
      await openInExplorer(path);
    } catch (err) {
      setDirError(err instanceof Error ? err.message : String(err));
    }
  };

  const openEntry = async (entry: FileEntry) => {
    if (entry.isDir) {
      setCurrentDir(entry.path);
      const cached = dirCache.current.get(entry.path);
      setDirEntries(cached ? [...cached] : []);
      await loadDirectoryEntries(entry.path);
      return;
    }

    await openPath(entry.path);

    if (isVideoFile(entry) && selected) {
      const now = Math.floor(Date.now() / 1000);
      const entryId = selected.id;
      const base = baseDir.trim();
      updatePlayHistory(base, entryId, entry.path, entry.name).catch(() => {
        return;
      });
      const index = items.findIndex((item) => item.id === entryId);
      if (index >= 0) {
        const updated = { ...items[index] };
        updated.lastPlayedPath = entry.path;
        updated.lastPlayedName = entry.name;
        updated.lastPlayedAt = now;
        setItems((prev) => prev.map((item) => (item.id === entryId ? updated : item)));
      }
    }
  };

  const playLast = async () => {
    if (!selected?.lastPlayedPath) return;
    await openPath(selected.lastPlayedPath);
  };

  const buildBreadcrumbs = useCallback(() => {
    if (!rootDir) return [];
    const root = rootDir;
    const current = currentDir || root;
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
  }, [currentDir, rootDir]);

  const breadcrumbs = useMemo(() => buildBreadcrumbs(), [buildBreadcrumbs]);

  const navigateBreadcrumb = (path: string) => {
    if (path === "home") {
      setPage("library");
      return;
    }
    setCurrentDir(path);
    const cached = dirCache.current.get(path);
    setDirEntries(cached ? [...cached] : []);
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
