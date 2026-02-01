#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Deserialize)]
struct ManifestRaw {
    title: Option<String>,
    fansub: Option<String>,
    subtitle_type: Option<String>,
    episodes: Option<String>,
    quality: Option<String>,
    note: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LibraryEntry {
    id: String,
    title: String,
    fansub: String,
    subtitle_type: String,
    episodes: String,
    quality: String,
    note: String,
    path: String,
    folder_name: String,
    group: String,
    relative_dir: String,
    last_played_path: String,
    last_played_name: String,
    last_played_at: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    size: u64,
    modified_at: i64,
    extension: String,
    has_manifest: bool,
    manifest_title: String,
    manifest_fansub: String,
    manifest_subtitle_type: String,
    manifest_episodes: String,
    manifest_quality: String,
    manifest_note: String,
}

fn normalize(value: Option<String>) -> String {
    value.unwrap_or_default().trim().to_string()
}

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

fn build_entry(base_dir: &Path, manifest_path: &Path, raw: ManifestRaw) -> LibraryEntry {
    let parent = manifest_path
        .parent()
        .unwrap_or_else(|| Path::new(""));
    let relative_dir = parent
        .strip_prefix(base_dir)
        .unwrap_or(parent)
        .to_string_lossy()
        .replace('\\', "/");

    let folder_name = parent
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| relative_dir.clone());

    let group = relative_dir
        .split('/')
        .next()
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string())
        .unwrap_or_else(|| folder_name.clone());

    let title = {
        let candidate = normalize(raw.title);
        if candidate.is_empty() {
            folder_name.clone()
        } else {
            candidate
        }
    };

    let library_root = normalize_path(base_dir);
    let id = format!("{}::{}", library_root, relative_dir);

    LibraryEntry {
        id,
        title,
        fansub: normalize(raw.fansub),
        subtitle_type: normalize(raw.subtitle_type),
        episodes: normalize(raw.episodes),
        quality: normalize(raw.quality),
        note: normalize(raw.note),
        path: normalize_path(parent),
        folder_name,
        group,
        relative_dir,
        last_played_path: String::new(),
        last_played_name: String::new(),
        last_played_at: 0,
    }
}

fn db_path(base_dir: &Path) -> PathBuf {
    base_dir.join("anime-manager.sqlite")
}

fn open_db(base_dir: &Path) -> Result<Connection, String> {
    if !base_dir.exists() {
        return Err(format!("Base directory not found: {}", base_dir.display()));
    }
    let conn = Connection::open(db_path(base_dir))
        .map_err(|err| format!("Failed to open database: {}", err))?;
    init_db(&conn)?;
    Ok(conn)
}

fn init_db(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS manifest_entries (
            id TEXT PRIMARY KEY,
            library_root TEXT NOT NULL,
            title TEXT,
            fansub TEXT,
            subtitle_type TEXT,
            episodes TEXT,
            quality TEXT,
            note TEXT,
            path TEXT,
            folder_name TEXT,
            group_name TEXT,
            relative_dir TEXT,
            updated_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_manifest_library ON manifest_entries (library_root);
        CREATE TABLE IF NOT EXISTS play_history (
            entry_id TEXT PRIMARY KEY,
            last_played_path TEXT,
            last_played_name TEXT,
            updated_at INTEGER
        );
        ",
    )
    .map_err(|err| format!("Failed to init database: {}", err))?;
    Ok(())
}

fn load_entries(conn: &Connection, library_root: &str) -> Result<Vec<LibraryEntry>, String> {
    let mut stmt = conn
        .prepare(
            "
            SELECT
                m.id,
                m.title,
                m.fansub,
                m.subtitle_type,
                m.episodes,
                m.quality,
                m.note,
                m.path,
                m.folder_name,
                m.group_name,
                m.relative_dir,
                COALESCE(p.last_played_path, ''),
                COALESCE(p.last_played_name, ''),
                COALESCE(p.updated_at, 0)
            FROM manifest_entries m
            LEFT JOIN play_history p ON m.id = p.entry_id
            WHERE m.library_root = ?
            ORDER BY m.group_name, m.title
            ",
        )
        .map_err(|err| format!("Failed to prepare query: {}", err))?;

    let rows = stmt
        .query_map([library_root], |row| {
            Ok(LibraryEntry {
                id: row.get(0)?,
                title: row.get(1)?,
                fansub: row.get(2)?,
                subtitle_type: row.get(3)?,
                episodes: row.get(4)?,
                quality: row.get(5)?,
                note: row.get(6)?,
                path: row.get(7)?,
                folder_name: row.get(8)?,
                group: row.get(9)?,
                relative_dir: row.get(10)?,
                last_played_path: row.get(11)?,
                last_played_name: row.get(12)?,
                last_played_at: row.get(13)?,
            })
        })
        .map_err(|err| format!("Failed to read entries: {}", err))?;

    let mut entries = Vec::new();
    for entry in rows {
        entries.push(entry.map_err(|err| format!("Failed to parse entry: {}", err))?);
    }

    Ok(entries)
}

#[tauri::command]
fn load_library(base_dir: String) -> Result<Vec<LibraryEntry>, String> {
    let base = PathBuf::from(base_dir.trim());
    let library_root = normalize_path(&base);
    let conn = open_db(&base)?;
    load_entries(&conn, &library_root)
}

#[tauri::command]
fn refresh_library(base_dir: String) -> Result<Vec<LibraryEntry>, String> {
    let base = PathBuf::from(base_dir.trim());
    if !base.exists() {
        return Err(format!("Base directory not found: {}", base.display()));
    }
    let library_root = normalize_path(&base);
    let mut conn = open_db(&base)?;

    let mut entries = Vec::new();
    for entry in WalkDir::new(&base).into_iter().filter_map(Result::ok) {
        if !entry.file_type().is_file() {
            continue;
        }
        if entry.file_name() != "manifest.yml" {
            continue;
        }

        let content = fs::read_to_string(entry.path())
            .map_err(|err| format!("Failed to read {}: {}", entry.path().display(), err))?;
        let raw: ManifestRaw = serde_yaml::from_str(&content)
            .map_err(|err| format!("Invalid YAML {}: {}", entry.path().display(), err))?;
        entries.push(build_entry(&base, entry.path(), raw));
    }

    entries.sort_by(|a, b| {
        a.group
            .cmp(&b.group)
            .then_with(|| a.title.cmp(&b.title))
    });

    let now = Utc::now().timestamp();
    {
        let tx = conn
            .transaction()
            .map_err(|err| format!("Failed to start transaction: {}", err))?;
        tx.execute(
            "DELETE FROM manifest_entries WHERE library_root = ?",
            [library_root.as_str()],
        )
        .map_err(|err| format!("Failed to clear entries: {}", err))?;

        {
            let mut stmt = tx
                .prepare(
                    "
                    INSERT INTO manifest_entries (
                        id,
                        library_root,
                        title,
                        fansub,
                        subtitle_type,
                        episodes,
                        quality,
                        note,
                        path,
                        folder_name,
                        group_name,
                        relative_dir,
                        updated_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
                    ",
                )
                .map_err(|err| format!("Failed to prepare insert: {}", err))?;

            for entry in &entries {
                stmt.execute(params![
                    entry.id.as_str(),
                    library_root.as_str(),
                    entry.title.as_str(),
                    entry.fansub.as_str(),
                    entry.subtitle_type.as_str(),
                    entry.episodes.as_str(),
                    entry.quality.as_str(),
                    entry.note.as_str(),
                    entry.path.as_str(),
                    entry.folder_name.as_str(),
                    entry.group.as_str(),
                    entry.relative_dir.as_str(),
                    now
                ])
                .map_err(|err| format!("Failed to insert entry: {}", err))?;
            }
        }

        tx.commit()
            .map_err(|err| format!("Failed to commit transaction: {}", err))?;
    }

    load_entries(&conn, &library_root)
}

#[tauri::command]
fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let target = PathBuf::from(path);
    let mut entries = Vec::new();
    let dir_entries = fs::read_dir(&target)
        .map_err(|err| format!("Failed to read directory {}: {}", target.display(), err))?;

    for entry in dir_entries {
        let entry = entry.map_err(|err| format!("Failed to read entry: {}", err))?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        if file_name.eq_ignore_ascii_case("manifest.yml") {
            continue;
        }
        let metadata = entry
            .metadata()
            .map_err(|err| format!("Failed to read metadata: {}", err))?;
        let file_type = metadata.is_dir();
        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|value| value.as_secs() as i64)
            .unwrap_or(0);
        let mut size = if metadata.is_file() { metadata.len() } else { 0 };
        let extension = entry
            .path()
            .extension()
            .map(|value| value.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        let mut has_manifest = false;
        let mut manifest_title = String::new();
        let mut manifest_fansub = String::new();
        let mut manifest_subtitle_type = String::new();
        let mut manifest_episodes = String::new();
        let mut manifest_quality = String::new();
        let mut manifest_note = String::new();

        if file_type {
            let manifest_path = entry.path().join("manifest.yml");
            if manifest_path.exists() {
                if let Ok(content) = fs::read_to_string(&manifest_path) {
                    if let Ok(raw) = serde_yaml::from_str::<ManifestRaw>(&content) {
                        has_manifest = true;
                        manifest_title = normalize(raw.title);
                        manifest_fansub = normalize(raw.fansub);
                        manifest_subtitle_type = normalize(raw.subtitle_type);
                        manifest_episodes = normalize(raw.episodes);
                        manifest_quality = normalize(raw.quality);
                        manifest_note = normalize(raw.note);
                    }
                }
            }
        }

        if file_type && has_manifest {
            size = dir_size(&entry.path());
        }

        entries.push(FileEntry {
            name: file_name,
            path: normalize_path(&entry.path()),
            is_dir: file_type,
            size,
            modified_at,
            extension,
            has_manifest,
            manifest_title,
            manifest_fansub,
            manifest_subtitle_type,
            manifest_episodes,
            manifest_quality,
            manifest_note,
        });
    }

    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => Ordering::Less,
        (false, true) => Ordering::Greater,
        _ => a.name.cmp(&b.name),
    });

    Ok(entries)
}

fn dir_size(path: &Path) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
        .filter_map(|entry| entry.metadata().ok().map(|meta| meta.len()))
        .sum()
}

#[tauri::command]
fn update_play_history(base_dir: String, entry_id: String, file_path: String, file_name: String) -> Result<(), String> {
    let base = PathBuf::from(base_dir.trim());
    let conn = open_db(&base)?;
    let now = Utc::now().timestamp();
    conn.execute(
        "
        INSERT INTO play_history (entry_id, last_played_path, last_played_name, updated_at)
        VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(entry_id) DO UPDATE SET
            last_played_path = excluded.last_played_path,
            last_played_name = excluded.last_played_name,
            updated_at = excluded.updated_at
        ",
        params![entry_id, file_path, file_name, now],
    )
    .map_err(|err| format!("Failed to update play history: {}", err))?;
    Ok(())
}

#[tauri::command]
fn open_in_explorer(path: String) -> Result<(), String> {
    open::that(path).map_err(|err| format!("Failed to open path: {}", err))?;
    Ok(())
}

#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    open::that(path).map_err(|err| format!("Failed to open path: {}", err))?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_library,
            refresh_library,
            list_directory,
            update_play_history,
            open_in_explorer,
            open_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
