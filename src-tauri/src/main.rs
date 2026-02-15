#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Deserialize)]
struct ManifestRaw {
    title: Option<String>,
    #[serde(default)]
    is_parent: bool,
    fansub: Option<String>,
    subtitle_type: Option<String>,
    episodes: Option<EpisodesValue>,
    quality: Option<String>,
    note: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum EpisodesValue {
    Int(i64),
    Str(String),
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LibraryEntry {
    id: String,
    title: String,
    fansub: String,
    subtitle_type: String,
    episodes: i64,
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
    manifest_episodes: i64,
    manifest_quality: String,
    manifest_note: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NewAnimePayload {
    title: String,
    fansub: Option<String>,
    subtitle_type: Option<String>,
    episodes: i64,
    quality: Option<String>,
    note: Option<String>,
    is_finished: bool,
}

#[derive(Debug, Serialize)]
struct ManifestWriteModel {
    title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    is_parent: Option<bool>,
    fansub: String,
    subtitle_type: String,
    episodes: i64,
    quality: String,
    note: String,
}

fn normalize(value: Option<String>) -> String {
    value.unwrap_or_default().trim().to_string()
}

fn normalize_episodes(value: Option<EpisodesValue>) -> i64 {
    match value {
        Some(EpisodesValue::Int(v)) => v,
        Some(EpisodesValue::Str(v)) => v.trim().parse::<i64>().unwrap_or(0),
        None => 0,
    }
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

    let group = folder_name.clone();

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
        episodes: normalize_episodes(raw.episodes),
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

fn default_group_from_relative(relative_dir: &str, fallback: &str) -> String {
    relative_dir
        .split('/')
        .next()
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string())
        .unwrap_or_else(|| fallback.to_string())
}

fn resolve_group_title(
    base: &Path,
    entry: &LibraryEntry,
    parent_manifest_titles: &HashMap<String, String>,
) -> String {
    let manifest_dir = PathBuf::from(&entry.path);

    // Manifest is directly under library root: each entry becomes its own group.
    if manifest_dir.parent().map(|p| p == base).unwrap_or(false) {
        return entry.title.clone();
    }

    // Nested manifest: walk ancestors to find a parent-manifest title (is_parent=true).
    let mut cursor = manifest_dir.parent();
    while let Some(parent) = cursor {
        if parent == base {
            break;
        }
        let key = normalize_path(parent);
        if let Some(title) = parent_manifest_titles.get(&key) {
            if !title.is_empty() {
                return title.clone();
            }
        }
        cursor = parent.parent();
    }

    default_group_from_relative(&entry.relative_dir, &entry.folder_name)
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
            episodes INTEGER,
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
                COALESCE(CAST(m.episodes AS INTEGER), 0),
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

    let mut parsed = Vec::<(PathBuf, ManifestRaw)>::new();
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
        parsed.push((entry.path().to_path_buf(), raw));
    }

    let mut parent_manifest_titles = HashMap::<String, String>::new();
    for (manifest_path, raw) in &parsed {
        if !raw.is_parent {
            continue;
        }
        let parent_dir = manifest_path
            .parent()
            .unwrap_or_else(|| Path::new(""));
        let fallback = parent_dir
            .file_name()
            .map(|v| v.to_string_lossy().to_string())
            .unwrap_or_default();
        let title = {
            let candidate = normalize(raw.title.clone());
            if candidate.is_empty() {
                fallback
            } else {
                candidate
            }
        };
        parent_manifest_titles.insert(normalize_path(parent_dir), title);
    }

    let mut entries = Vec::new();
    for (manifest_path, raw) in parsed {
        if raw.is_parent {
            continue;
        }
        let mut entry = build_entry(&base, &manifest_path, raw);
        entry.group = resolve_group_title(&base, &entry, &parent_manifest_titles);
        entries.push(entry);
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
                    entry.episodes,
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
        let mut manifest_episodes = 0;
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
                        manifest_episodes = normalize_episodes(raw.episodes);
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

fn normalize_new_text(value: Option<String>) -> String {
    value.unwrap_or_default().trim().to_string()
}

fn markdown_anchor(text: &str) -> String {
    text.to_lowercase()
        .chars()
        .filter(|ch| {
            !matches!(
                ch,
                '【' | '】' | '[' | ']' | '(' | ')' | '（' | '）' | '：' | ':' | '、' | ',' | '，' | '。' | '!' | '！' | '?' | '？' | '"' | '\''
            )
        })
        .map(|ch| if ch.is_whitespace() { '-' } else { ch })
        .collect::<String>()
}

fn format_episodes(value: i64) -> String {
    if value > 0 {
        value.to_string()
    } else if value == 0 {
        "未知".to_string()
    } else {
        "未完结".to_string()
    }
}

fn build_video_index_markdown(entries: &[LibraryEntry]) -> String {
    let mut groups = HashMap::<String, Vec<&LibraryEntry>>::new();
    for entry in entries {
        groups.entry(entry.group.clone()).or_default().push(entry);
    }

    let mut group_names: Vec<String> = groups.keys().cloned().collect();
    group_names.sort();
    for name in &group_names {
        if let Some(items) = groups.get_mut(name) {
            items.sort_by(|a, b| a.title.cmp(&b.title));
        }
    }

    let mut lines = Vec::<String>::new();
    lines.push("# 视频信息".to_string());
    lines.push(String::new());
    lines.push("## 目录".to_string());
    lines.push(String::new());
    lines.push("- [视频信息](#视频信息)".to_string());
    lines.push("  - [目录](#目录)".to_string());
    for group in &group_names {
        lines.push(format!("    - [{}](#{})", group, markdown_anchor(group)));
        if let Some(items) = groups.get(group) {
            for item in items {
                if item.title != *group {
                    lines.push(format!(
                        "      - [{}](#{})",
                        item.title,
                        markdown_anchor(&item.title)
                    ));
                }
            }
        }
    }

    lines.push(String::new());
    for group in &group_names {
        lines.push(format!("### {}", group));
        lines.push(String::new());
        if let Some(items) = groups.get(group) {
            for item in items {
                if item.title != *group {
                    lines.push(format!("#### {}", item.title));
                }
                lines.push("```".to_string());
                lines.push(format!("文件夹名:{}", item.folder_name));
                lines.push(String::new());
                lines.push(format!("字幕组:{}", if item.fansub.is_empty() { "未知" } else { &item.fansub }));
                lines.push(String::new());
                lines.push(format!(
                    "字幕形式:{}",
                    if item.subtitle_type.is_empty() {
                        "未知"
                    } else {
                        &item.subtitle_type
                    }
                ));
                lines.push(String::new());
                lines.push(format!("集数:{}", format_episodes(item.episodes)));
                lines.push(String::new());
                lines.push(format!("画质:{}", if item.quality.is_empty() { "未知" } else { &item.quality }));
                if !item.note.is_empty() {
                    lines.push(String::new());
                    lines.push(format!("备注:{}", item.note));
                }
                lines.push("```".to_string());
                lines.push(String::new());
            }
        }
    }

    lines.join("\n")
}

#[tauri::command]
fn create_anime_manifest(base_dir: String, payload: NewAnimePayload) -> Result<Option<String>, String> {
    let base = PathBuf::from(base_dir.trim());
    if !base.exists() {
        return Err(format!("Base directory not found: {}", base.display()));
    }

    let title = payload.title.trim().to_string();
    if title.is_empty() {
        return Err("动画名称不能为空".to_string());
    }

    let episodes = if payload.is_finished {
        if payload.episodes < 0 {
            return Err("已完结动画的集数必须是非负整数（0 表示未知）".to_string());
        }
        payload.episodes
    } else {
        -1
    };

    let selected_path = rfd::FileDialog::new()
        .set_title("保存 manifest.yml")
        .set_directory(&base)
        .set_file_name("manifest.yml")
        .save_file();
    let Some(manifest_path) = selected_path else {
        return Ok(None);
    };
    if let Some(parent) = manifest_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|err| format!("Failed to create folder {}: {}", parent.display(), err))?;
    }

    let content = serde_yaml::to_string(&ManifestWriteModel {
        title,
        is_parent: None,
        fansub: normalize_new_text(payload.fansub),
        subtitle_type: normalize_new_text(payload.subtitle_type),
        episodes,
        quality: normalize_new_text(payload.quality),
        note: normalize_new_text(payload.note),
    })
    .map_err(|err| format!("Failed to build manifest content: {}", err))?;

    fs::write(&manifest_path, content)
        .map_err(|err| format!("Failed to write {}: {}", manifest_path.display(), err))?;

    Ok(Some(normalize_path(&manifest_path)))
}

#[tauri::command]
fn update_anime_manifest(entry_path: String, payload: NewAnimePayload) -> Result<String, String> {
    let target_dir = PathBuf::from(entry_path.trim());
    if !target_dir.exists() {
        return Err(format!("Entry directory not found: {}", target_dir.display()));
    }

    let title = payload.title.trim().to_string();
    if title.is_empty() {
        return Err("动画名称不能为空".to_string());
    }

    let episodes = if payload.is_finished {
        if payload.episodes < 0 {
            return Err("已完结动画的集数必须是非负整数（0 表示未知）".to_string());
        }
        payload.episodes
    } else {
        -1
    };

    let manifest_path = target_dir.join("manifest.yml");
    let existing_parent_flag = fs::read_to_string(&manifest_path)
        .ok()
        .and_then(|content| serde_yaml::from_str::<ManifestRaw>(&content).ok())
        .map(|raw| raw.is_parent)
        .unwrap_or(false);

    let content = serde_yaml::to_string(&ManifestWriteModel {
        title,
        is_parent: if existing_parent_flag { Some(true) } else { None },
        fansub: normalize_new_text(payload.fansub),
        subtitle_type: normalize_new_text(payload.subtitle_type),
        episodes,
        quality: normalize_new_text(payload.quality),
        note: normalize_new_text(payload.note),
    })
    .map_err(|err| format!("Failed to build manifest content: {}", err))?;

    fs::write(&manifest_path, content)
        .map_err(|err| format!("Failed to write {}: {}", manifest_path.display(), err))?;

    Ok(normalize_path(&manifest_path))
}

#[tauri::command]
fn generate_video_index_markdown(base_dir: String) -> Result<String, String> {
    let base = PathBuf::from(base_dir.trim());
    if !base.exists() {
        return Err(format!("Base directory not found: {}", base.display()));
    }

    let entries = refresh_library(base_dir)?;
    let markdown = build_video_index_markdown(&entries);
    let output_path = base.join("视频索引.MD");
    fs::write(&output_path, markdown)
        .map_err(|err| format!("Failed to write {}: {}", output_path.display(), err))?;
    Ok(normalize_path(&output_path))
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

#[tauri::command]
fn show_error_dialog(title: String, message: String) -> Result<(), String> {
    rfd::MessageDialog::new()
        .set_title(title)
        .set_description(message)
        .set_level(rfd::MessageLevel::Error)
        .show();
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_library,
            refresh_library,
            list_directory,
            create_anime_manifest,
            update_anime_manifest,
            generate_video_index_markdown,
            update_play_history,
            open_in_explorer,
            open_path,
            show_error_dialog
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
