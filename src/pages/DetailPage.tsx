import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Spinner,
  Text,
  Textarea,
  Title2,
} from "@fluentui/react-components";
import {
  ArrowUpRegular,
  DismissRegular,
  EditRegular,
  FolderOpenRegular,
  PlayRegular,
  SaveRegular,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FileEntry, LibraryEntry, NewAnimePayload } from "../types";

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
  onEditAnime: (entryPath: string, payload: NewAnimePayload) => Promise<void>;
}

export default function DetailPage(props: DetailPageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const totalSize = useMemo(
    () => props.dirEntries.reduce((acc, entry) => acc + (entry.size || 0), 0),
    [props.dirEntries]
  );
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [title, setTitle] = useState("");
  const [fansub, setFansub] = useState("");
  const [subtitleType, setSubtitleType] = useState("");
  const [quality, setQuality] = useState("");
  const [note, setNote] = useState("");
  const [isFinished, setIsFinished] = useState(false);
  const [episodes, setEpisodes] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);

  const subtitlePreset = ["简体内嵌", "简日双语", "简繁内封", "繁体内嵌", "繁日双语"];
  const qualityPreset = ["2K", "1080P", "720P", "480P"];

  useEffect(() => {
    if (!editOpen || !props.selected) return;
    setTitle(props.selected.title ?? "");
    setFansub(props.selected.fansub ?? "");
    setSubtitleType(props.selected.subtitleType ?? "");
    setQuality(props.selected.quality ?? "");
    setNote(props.selected.note ?? "");
    const finished = props.selected.episodes > 0;
    setIsFinished(finished);
    setEpisodes(finished ? `${props.selected.episodes}` : "");
    setFormError("");
  }, [editOpen, props.selected]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => {
      setShowBackToTop(container.scrollTop > 200);
    };

    onScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
    };
  }, [props.active]);

  const onSubmit = async () => {
    if (!props.selected) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError("动画名称为必填项");
      return;
    }

    let parsedEpisodes = 0;
    if (isFinished) {
      const value = Number.parseInt(episodes.trim(), 10);
      if (!Number.isInteger(value) || value <= 0) {
        setFormError("已完结时，集数必须为正整数");
        return;
      }
      parsedEpisodes = value;
    }

    setFormError("");
    setSaving(true);
    try {
      await props.onEditAnime(props.selected.path, {
        title: trimmedTitle,
        fansub: fansub.trim(),
        subtitleType: subtitleType.trim(),
        quality: quality.trim(),
        note: note.trim(),
        isFinished,
        episodes: parsedEpisodes,
      });
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`page detail-page ${props.active ? "active" : ""}`} aria-hidden={!props.active}>
      <div ref={containerRef} className="page-container">
        <Card className="detail-header">
          <div className="breadcrumb-bar">
            {props.breadcrumbs.map((crumb, index) => (
              <div key={crumb.path} className="breadcrumb-segment">
                <button
                  className="breadcrumb-item"
                  type="button"
                  disabled={index === props.breadcrumbs.length - 1}
                  onClick={() => props.onNavigateBreadcrumb(crumb.path)}
                >
                  {crumb.label}
                </button>
                {index < props.breadcrumbs.length - 1 && <span className="breadcrumb-separator">&gt;</span>}
              </div>
            ))}
          </div>
          <Title2>{props.selected?.title || "详情"}</Title2>
          <Text>双击条目用系统默认播放器播放。</Text>
          <div>
            <Button icon={<FolderOpenRegular />} onClick={() => props.onOpenFolder(props.currentDir || props.rootDir)}>
              打开文件夹
            </Button>
          </div>
        </Card>

        <div className="detail-body">
          <aside className="detail-sidebar">
            <Card className="detail-info-card">
              <div className="detail-card-header">
                <Title2>本地信息</Title2>
                <Button
                  appearance="secondary"
                  disabled={!props.selected}
                  icon={<EditRegular />}
                  onClick={() => setEditOpen(true)}
                >
                  编辑
                </Button>
              </div>
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
                  <dd>
                    {props.selected
                      ? props.selected.episodes > 0
                        ? `${props.selected.episodes} 集`
                        : props.selected.episodes === 0
                          ? "未知"
                          : "未完结"
                      : "-"}
                  </dd>
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
                icon={<PlayRegular />}
                onClick={props.onPlayLast}
              >
                使用系统播放器播放
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
                <div className="file-list">
                  {props.dirEntries.map((entry) => (
                    <div
                      key={entry.path}
                      className={`file-row ${entry.hasManifest ? "manifest-row" : ""}`}
                      onDoubleClick={() => props.onOpenEntry(entry)}
                    >
                      <div className="file-main">
                        <div className="file-name">{entry.hasManifest ? entry.manifestTitle || entry.name : entry.name}</div>
                        <div className="file-sub">{entry.name}</div>
                      </div>
                      <div className="file-tags">
                        {entry.hasManifest ? (
                          <>
                            {entry.manifestQuality && <Badge>{entry.manifestQuality}</Badge>}
                            <Badge>{entry.manifestEpisodes > 0 ? `${entry.manifestEpisodes} 集` : entry.manifestEpisodes === 0 ? "未知" : "未完结"}</Badge>
                            {entry.manifestFansub && <Badge appearance="tint">字幕组：{entry.manifestFansub}</Badge>}
                            {entry.manifestSubtitleType && <Badge appearance="tint">字幕：{entry.manifestSubtitleType}</Badge>}
                          </>
                        ) : (
                          <>
                            <Badge>{entry.isDir ? "文件夹" : entry.extension || "文件"}</Badge>
                            <Badge appearance="tint">{entry.isDir ? props.formatSize(entry.size) : props.formatSize(entry.size)}</Badge>
                            {props.isVideoFile(entry) && <Badge color="informative">视频</Badge>}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </main>
        </div>
      </div>

      <Button
        className={`back-to-top-launcher ${showBackToTop ? "is-visible" : "is-hidden"}`}
        appearance="secondary"
        icon={<ArrowUpRegular />}
        disabled={!showBackToTop}
        onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
      >
        返回顶部
      </Button>

      <Dialog open={editOpen} onOpenChange={(_, data) => setEditOpen(data.open)}>
        <DialogSurface className="register-dialog">
          <DialogBody>
            <DialogTitle>编辑动画信息</DialogTitle>
            <DialogContent>
              <div className="register-form">
                <Field label="动画名称" required validationMessage={formError && !title.trim() ? formError : undefined}>
                  <Input value={title} onChange={(_, data) => setTitle(data.value)} />
                </Field>
                <Field label="字幕组">
                  <Input value={fansub} onChange={(_, data) => setFansub(data.value)} />
                </Field>
                <Field label="字幕类型">
                  <Input
                    value={subtitleType}
                    onChange={(_, data) => setSubtitleType(data.value)}
                    list="detail-subtitle-type-options"
                    placeholder="可选择或手动输入"
                  />
                  <datalist id="detail-subtitle-type-options">
                    {subtitlePreset.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </Field>
                <Checkbox
                  checked={isFinished}
                  onChange={(_, data) => setIsFinished(Boolean(data.checked))}
                  label="已完结"
                />
                <Field
                  label="集数"
                  validationMessage={formError && isFinished ? formError : undefined}
                >
                  <Input
                    value={isFinished ? episodes : "0"}
                    onChange={(_, data) => setEpisodes(data.value)}
                    disabled={!isFinished}
                    type="number"
                    min={1}
                    placeholder={isFinished ? "请输入正整数" : "0"}
                  />
                </Field>
                <Field label="清晰度">
                  <Input
                    value={quality}
                    onChange={(_, data) => setQuality(data.value)}
                    list="detail-quality-options"
                    placeholder="可选择或手动输入"
                  />
                  <datalist id="detail-quality-options">
                    {qualityPreset.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </Field>
                <Field label="备注">
                  <Textarea
                    value={note}
                    onChange={(_, data) => setNote(data.value)}
                    resize="vertical"
                    placeholder="可选"
                  />
                </Field>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" icon={<DismissRegular />} disabled={saving} onClick={() => setEditOpen(false)}>
                取消
              </Button>
              <Button appearance="primary" icon={<SaveRegular />} disabled={saving || !props.selected} onClick={onSubmit}>
                {saving ? "保存中..." : "保存"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </section>
  );
}
