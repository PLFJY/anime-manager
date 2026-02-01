# Anime Manager

本地动漫资源管理器（Tauri + Vue 3 + Vuetify）。通过扫描你的本地视频库下的
`manifest.yml` 生成索引，并缓存到 SQLite，提供快速检索与浏览。

## 快速开始

```bash
pnpm tauri dev
```

## 配置本地视频库（重点）

应用通过“库目录”扫描所有 `manifest.yml` 来建立索引。**没有 `manifest.yml` 的目录不会入库**。

### 1) 选择库目录

打开应用 → 设置页 → **库目录**，填入你的视频库根路径，例如：

```
F:\Videos
```

库目录会被保存到本地配置（LocalStorage），下次启动自动恢复。

### 2) 组织目录结构

推荐结构（一级目录用于分组）：

```
F:\Videos
├─ 2024
│  ├─ 葬送的芙莉莲
│  │  ├─ manifest.yml
│  │  ├─ S01E01.mkv
│  │  └─ ...
│  └─ 孤独摇滚
│     └─ manifest.yml
└─ 经典
   └─ EVA
      └─ manifest.yml
```

分组逻辑：
- **group** = 库目录下的**一级文件夹名称**（如 `2024` / `经典`）
- 如果条目直接放在库根目录下，则用该条目的文件夹名作为 group

### 3) 添加 `manifest.yml`

在每个作品的根目录放一个 `manifest.yml`。字段全部可选，但建议完整填写。

示例：

```yaml
title: 葬送的芙莉莲
fansub: LoliHouse
subtitle_type: 简中/繁中
episodes: 28
quality: 1080p
note: BD 版本
```

字段说明：
- `title`: 标题（为空时会退回使用文件夹名）
- `fansub`: 字幕组
- `subtitle_type`: 字幕类型（注意是 **subtitle_type**，带下划线）
- `episodes`: 集数（字符串即可）
- `quality`: 画质（如 1080p / 4K / WEB / BD）
- `note`: 备注

注意：
- YAML 必须格式正确，否则该条目会被忽略并在刷新时抛错提示。
- `manifest.yml` 必须是文件名全小写。

### 4) 刷新 / 读取缓存

设置页提供两种动作：
- **手动更新库**：重新扫描库目录内的 `manifest.yml`，重建索引
- **读取缓存**：直接从 SQLite 读取上次缓存（更快）

缓存数据库位置：

```
<库目录>\anime-manager.sqlite
```

### 5) 常见问题

- 为什么条目不显示？
  - 对应目录没有 `manifest.yml`
  - `manifest.yml` 格式错误（YAML 语法/字段拼写）
  - 库目录路径填写错误

- 标题显示成文件夹名？
  - `manifest.yml` 里没有 `title` 或为空
