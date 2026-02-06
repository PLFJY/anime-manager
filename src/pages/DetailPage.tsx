import { Badge, Button, Card, Spinner, Text, Title2 } from "@fluentui/react-components";
import { useMemo } from "react";
import type { FileEntry, LibraryEntry } from "../types";

type Breadcrumb = { label: string; path: string };

interface DetailPageProps {
  active: boolean;
  selected: LibraryEntry | null;
  dirEntries: FileEntry[];
  dirLoading: boolean;
  dirError: string;
  breadcrumbs: Breadcrumb[];
  currentDir: string;
  rootDir: string;
  formatSize: (size?: number) => string;
  formatDate: (timestamp?: number) => string;
  isVideoFile: (entry: FileEntry) => boolean;
  onOpenFolder: (path: string) => void;
  onOpenEntry: (entry: FileEntry) => void;
  onPlayLast: () => void;
  onNavigateBreadcrumb: (path: string) => void;
}

export default function DetailPage(props: DetailPageProps) {
  const totalSize = useMemo(
    () => props.dirEntries.reduce((acc, entry) => acc + (entry.size || 0), 0),
    [props.dirEntries]
  );

  return (
    <section className={`page detail-page ${props.active ? "active" : ""}`} aria-hidden={!props.active}>
      <div className="page-container">
        <Card className="detail-header">
          <div className="breadcrumb-bar">
            {props.breadcrumbs.map((crumb, index) => (
              <button
                key={crumb.path}
                className="breadcrumb-item"
                type="button"
                disabled={index === props.breadcrumbs.length - 1}
                onClick={() => props.onNavigateBreadcrumb(crumb.path)}
              >
                {crumb.label}
              </button>
            ))}
          </div>
          <Title2>{props.selected?.title || "详情"}</Title2>
          <Text>双击条目用系统默认播放器播放。</Text>
          <div>
            <Button onClick={() => props.onOpenFolder(props.currentDir || props.rootDir)}>
              打开文件夹
            </Button>
          </div>
        </Card>

        <div className="detail-body">
          <aside className="detail-sidebar">
            <Card className="detail-info-card">
              <Title2>本地信息</Title2>
              <div className="detail-info-grid">
                <div className="detail-info-item">
                  <dt>文件夹大小</dt>
                  <dd>{props.formatSize(totalSize)}</dd>
                </div>
                <div className="detail-info-item">
                  <dt>字幕组</dt>
                  <dd>{props.selected?.fansub || "-"}</dd>
                </div>
                <div className="detail-info-item">
                  <dt>字幕形式</dt>
                  <dd>{props.selected?.subtitleType || "-"}</dd>
                </div>
                <div className="detail-info-item">
                  <dt>集数</dt>
                  <dd>{props.selected?.episodes || "-"}</dd>
                </div>
                <div className="detail-info-item">
                  <dt>画质</dt>
                  <dd>{props.selected?.quality || "-"}</dd>
                </div>
                <div className="detail-info-item">
                  <dt>备注</dt>
                  <dd>{props.selected?.note || "-"}</dd>
                </div>
              </div>
            </Card>

            <Card className="detail-info-card">
              <Title2>最近播放</Title2>
              <Text>{props.selected?.lastPlayedName || "暂无播放记录"}</Text>
              <Text>{props.formatDate(props.selected?.lastPlayedAt)}</Text>
              <Button
                appearance="primary"
                disabled={!props.selected?.lastPlayedPath}
                onClick={props.onPlayLast}
              >
                使用系统播放器
              </Button>
            </Card>
          </aside>

          <main className="detail-content">
            <Card className="detail-info-card">
              <Title2>资源一览</Title2>
              {props.dirLoading && (
                <div className="loading-state">
                  <Spinner />
                  <span>读取目录中...</span>
                </div>
              )}
              {!props.dirLoading && props.dirError && (
                <Card className="error-card">
                  <Text>{props.dirError}</Text>
                </Card>
              )}
              {!props.dirLoading && !props.dirError && (
                <div className="file-grid">
                  {props.dirEntries.map((entry) => (
                    <Card
                      key={entry.path}
                      className={`file-card ${entry.hasManifest ? "manifest-card" : ""}`}
                      onDoubleClick={() => props.onOpenEntry(entry)}
                    >
                      {entry.hasManifest ? (
                        <>
                          <div className="manifest-header">
                            <div>{entry.manifestTitle || entry.name}</div>
                            {entry.name !== entry.manifestTitle && <Text size={200}>{entry.name}</Text>}
                            <div className="anime-card-badges">
                              {entry.manifestQuality && <Badge>{entry.manifestQuality}</Badge>}
                              {entry.manifestEpisodes && <Badge>{entry.manifestEpisodes}</Badge>}
                            </div>
                          </div>
                          <div className="file-meta">
                            {entry.manifestFansub && <span>字幕组：{entry.manifestFansub}</span>}
                            {entry.manifestSubtitleType && <span>字幕：{entry.manifestSubtitleType}</span>}
                            {entry.manifestNote && <span>{entry.manifestNote}</span>}
                            {entry.size > 0 && <span>文件夹大小：{props.formatSize(entry.size)}</span>}
                          </div>
                        </>
                      ) : (
                        <div>
                          <div className="file-name">{entry.name}</div>
                          <div className="file-meta">
                            <span>{entry.isDir ? "文件夹" : props.formatSize(entry.size)}</span>
                            {!entry.isDir && <span>{entry.extension || "文件"}</span>}
                            {props.isVideoFile(entry) && <span>视频</span>}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </main>
        </div>
      </div>
    </section>
  );
}
