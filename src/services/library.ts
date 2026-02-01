import { invoke } from "@tauri-apps/api/core";
import type { FileEntry, LibraryEntry } from "../types";

export async function loadLibrary(baseDir: string): Promise<LibraryEntry[]> {
  return await invoke<LibraryEntry[]>("load_library", { baseDir });
}

export async function refreshLibrary(baseDir: string): Promise<LibraryEntry[]> {
  return await invoke<LibraryEntry[]>("refresh_library", { baseDir });
}

export async function listDirectory(path: string): Promise<FileEntry[]> {
  return await invoke<FileEntry[]>("list_directory", { path });
}

export async function updatePlayHistory(
  baseDir: string,
  entryId: string,
  filePath: string,
  fileName: string
): Promise<void> {
  await invoke<void>("update_play_history", {
    baseDir,
    entryId,
    filePath,
    fileName,
  });
}

export async function openInExplorer(path: string): Promise<void> {
  await invoke<void>("open_in_explorer", { path });
}

export async function openPath(path: string): Promise<void> {
  await invoke<void>("open_path", { path });
}
