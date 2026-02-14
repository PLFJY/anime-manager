export interface LibraryEntry {
  id: string;
  title: string;
  fansub: string;
  subtitleType: string;
  episodes: number;
  quality: string;
  note: string;
  path: string;
  folderName: string;
  group: string;
  relativeDir: string;
  lastPlayedPath: string;
  lastPlayedName: string;
  lastPlayedAt: number;
}

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modifiedAt: number;
  extension: string;
  hasManifest: boolean;
  manifestTitle: string;
  manifestFansub: string;
  manifestSubtitleType: string;
  manifestEpisodes: number;
  manifestQuality: string;
  manifestNote: string;
}

export interface NewAnimePayload {
  title: string;
  fansub: string;
  subtitleType: string;
  quality: string;
  note: string;
  isFinished: boolean;
  episodes: number;
}
