import { invoke } from "@tauri-apps/api/core";
import type { FileEntry, LibraryEntry, NewAnimePayload } from "../types";

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

export async function createAnimeManifest(baseDir: string, payload: NewAnimePayload): Promise<string | null> {
  return await invoke<string | null>("create_anime_manifest", {
    baseDir,
    payload: {
      title: payload.title,
      fansub: payload.fansub,
      subtitleType: payload.subtitleType,
      quality: payload.quality,
      note: payload.note,
      isFinished: payload.isFinished,
      episodes: payload.episodes,
    },
  });
}

export async function updateAnimeManifest(entryPath: string, payload: NewAnimePayload): Promise<string> {
  return await invoke<string>("update_anime_manifest", {
    entryPath,
    payload: {
      title: payload.title,
      fansub: payload.fansub,
      subtitleType: payload.subtitleType,
      quality: payload.quality,
      note: payload.note,
      isFinished: payload.isFinished,
      episodes: payload.episodes,
    },
  });
}

export async function showErrorDialog(title: string, message: string): Promise<void> {
  await invoke<void>("show_error_dialog", { title, message });
}

export async function generateVideoIndexMarkdown(baseDir: string): Promise<string> {
  return await invoke<string>("generate_video_index_markdown", { baseDir });
}
