export interface LibraryEntry {
  id: string;
  title: string;
  fansub: string;
  subtitleType: string;
  episodes: string;
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
  manifestEpisodes: string;
  manifestQuality: string;
  manifestNote: string;
}
