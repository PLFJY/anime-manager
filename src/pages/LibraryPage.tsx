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
  AddRegular,
  ArrowResetRegular,
  ArrowUpRegular,
  CheckmarkRegular,
  DismissRegular,
  FilterRegular,
  SaveRegular,
  SearchRegular,
} from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import type { LibraryEntry, NewAnimePayload } from "../types";

type OptionCount = { name: string; count: number };
type GroupedItems = { name: string; items: LibraryEntry[] };

interface LibraryPageProps {
  active: boolean;
  baseDir: string;
  items: LibraryEntry[];
  loading: boolean;
  loadingAction: "load" | "refresh" | null;
  error: string;
  search: string;
  statusOptions: OptionCount[];
  fansubOptions: OptionCount[];
  subtitleOptions: OptionCount[];
  qualityOptions: OptionCount[];
  statusFilter: string[];
  fansubFilter: string[];
  subtitleFilter: string[];
  qualityFilter: string[];
  hasAnyFilter: boolean;
  groupedItems: GroupedItems[];
  filteredItems: LibraryEntry[];
  showFilters: boolean;
  animationsEnabled: boolean;
  selectedId: string | null;
  onSearchChange: (value: string) => void;
  onToggleStatus: (value: string) => void;
  onToggleFansub: (value: string) => void;
  onToggleSubtitle: (value: string) => void;
  onToggleQuality: (value: string) => void;
  onClearFilters: () => void;
  onToggleFilters: () => void;
  onCloseFilters: () => void;
  onSelectItem: (value: string | null) => void;
  onOpenDetail: (value: LibraryEntry) => void;
  onRegisterAnime: (payload: NewAnimePayload) => Promise<boolean>;
}

export default function LibraryPage(props: LibraryPageProps) {
  const pageClass = `page library-page ${props.active ? "active" : ""}`;
  const loadingText = props.loadingAction === "refresh" ? "正在更新缓存..." : "正在读取缓存...";
  const drawerRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
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
    if (!props.showFilters) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const inDrawer = drawerRef.current?.contains(target);
      const inTrigger = triggerRef.current?.contains(target);
      if (!inDrawer && !inTrigger) {
        props.onCloseFilters();
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const inDrawer = drawerRef.current?.contains(target);
      const inTrigger = triggerRef.current?.contains(target);
      if (!inDrawer && !inTrigger) {
        props.onCloseFilters();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [props.showFilters, props.onCloseFilters]);

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

  const resetForm = () => {
    setTitle("");
    setFansub("");
    setSubtitleType("");
    setQuality("");
    setNote("");
    setIsFinished(false);
    setEpisodes("");
    setFormError("");
  };

  const onSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError("动画名称为必填项");
      return;
    }

    let parsedEpisodes = -1;
    if (isFinished) {
      const value = Number.parseInt(episodes.trim(), 10);
      if (!Number.isInteger(value) || value <= 0) {
        setFormError("已完结时，集数必须为正整数");
        return;
      }
      parsedEpisodes = value;
    }

    setFormError("");
    setRegistering(true);
    try {
      const saved = await props.onRegisterAnime({
        title: trimmedTitle,
        fansub: fansub.trim(),
        subtitleType: subtitleType.trim(),
        quality: quality.trim(),
        note: note.trim(),
        isFinished,
        episodes: parsedEpisodes,
      });
      if (saved) {
        setRegisterOpen(false);
        resetForm();
      }
    } catch {
      // Error details are shown by native dialog in App-level handler.
    } finally {
      setRegistering(false);
    }
  };

  return (
    <section className={pageClass} aria-hidden={!props.active}>
      <div ref={containerRef} className="page-container">
        <header className="page-header">
          <Title2>动漫资源管理台</Title2>
          <p className="subtitle">Anime Library / Fluent UI</p>
          <p className="subtitle">通过 SQLite 缓存本地 manifest.yml，并提供轻量级资源浏览。</p>
          <p className="subtitle">当前库目录：{props.baseDir}</p>
        </header>

        <Card className="controls-bar">
          <div className="controls-row">
            <Input
              value={props.search}
              onChange={(_, data) => props.onSearchChange(data.value)}
              placeholder="搜索标题 / 字幕组 / 画质"
              contentBefore={<SearchRegular />}
            />
            <Button appearance="primary" icon={<AddRegular />} onClick={() => setRegisterOpen(true)}>
              登记新动画
            </Button>
          </div>
        </Card>

        <div className="stats-bar">
          <span>共 {props.items.length} 条记录</span>
          {props.filteredItems.length !== props.items.length && (
            <span>（筛选后 {props.filteredItems.length} 条）</span>
          )}
          {props.loading && (
            <>
              <Spinner size="tiny" />
              <span>{loadingText}</span>
            </>
          )}
        </div>

        <div className="library-layout">
          <main className="library-content">
            {props.loading && (
              <div className="loading-state">
                <Spinner />
                <span>{loadingText}</span>
              </div>
            )}

            {!props.loading && props.error && (
              <Card className="error-card">
                <Text weight="semibold">读取失败</Text>
                <Text>{props.error}</Text>
              </Card>
            )}

            {!props.loading && !props.error && !props.filteredItems.length && (
              <div className="empty-state">
                <Title2>暂无匹配条目</Title2>
                <Text>请前往设置页手动更新库，或调整筛选条件。</Text>
              </div>
            )}

            {!props.loading && !props.error && props.filteredItems.length > 0 && (
              <div className="groups">
                {props.groupedItems.map((group) => (
                  <section key={group.name} className="group-section">
                    <div className="group-header">
                      <Title2>{group.name}</Title2>
                      <Badge>{group.items.length}</Badge>
                    </div>
                    <div className="anime-grid">
                      {group.items.map((item) => (
                        <Card
                          key={item.id}
                          className={`anime-card ${item.id === props.selectedId ? "selected" : ""} ${
                            props.animationsEnabled ? "animate-in" : ""
                          }`}
                          onClick={() => props.onSelectItem(item.id)}
                          onDoubleClick={() => props.onOpenDetail(item)}
                        >
                          <div className="anime-card-header">
                            <div className="anime-card-title">{item.title}</div>
                            <div className="anime-card-folder">{item.folderName}</div>
                            <div className="anime-card-badges">
                              <Badge>{item.episodes > 0 ? `${item.episodes} 集` : "未完结"}</Badge>
                              {item.quality && <Badge color="informative">{item.quality}</Badge>}
                            </div>
                          </div>
                          <div className="anime-card-body">
                            <div className="anime-card-meta">
                              <span>字幕组：{item.fansub || "未知字幕组"}</span>
                              <span>字幕：{item.subtitleType || "未知字幕"}</span>
                              {item.lastPlayedName && <span>上次播放：{item.lastPlayedName}</span>}
                            </div>
                            <div className="anime-card-path">{item.relativeDir}</div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {props.showFilters && <div className="filter-overlay" />}
      <Button
        className={`back-to-top-launcher ${showBackToTop ? "is-visible" : "is-hidden"}`}
        appearance="secondary"
        icon={<ArrowUpRegular />}
        disabled={!showBackToTop}
        onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
      >
        返回顶部
      </Button>
      <Button
        ref={triggerRef}
        className="filter-launcher"
        appearance={props.showFilters ? "primary" : "secondary"}
        icon={<FilterRegular />}
        onClick={props.onToggleFilters}
      >
        筛选器
      </Button>
      <aside
        ref={drawerRef}
        className={`filter-drawer ${props.showFilters ? "open" : "closed"}`}
        tabIndex={-1}
      >
        <div className="filter-title-row">
          <Title2>筛选器</Title2>
          <Button
            appearance="subtle"
            icon={<DismissRegular />}
            onClick={props.onCloseFilters}
          />
        </div>

        <Button
          className="filter-clear-button"
          appearance={props.hasAnyFilter ? "secondary" : "primary"}
          icon={<ArrowResetRegular />}
          onClick={props.onClearFilters}
        >
          显示全部
        </Button>

        <div className="filter-group">
          <Text weight="semibold">完结状态</Text>
          <div className="filter-chip-list">
            {props.statusOptions.map((option) => {
              const selected = props.statusFilter.includes(option.name);
              return (
                <button
                  key={option.name}
                  type="button"
                  className={`filter-chip ${selected ? "selected" : ""}`}
                  onClick={() => props.onToggleStatus(option.name)}
                >
                  {selected && <CheckmarkRegular />}
                  <span>{option.name}</span>
                  <span className="chip-count">{option.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="filter-group">
          <Text weight="semibold">画质</Text>
          <div className="filter-chip-list">
            {props.qualityOptions.map((option) => {
              const selected = props.qualityFilter.includes(option.name);
              return (
                <button
                  key={option.name}
                  type="button"
                  className={`filter-chip ${selected ? "selected" : ""}`}
                  onClick={() => props.onToggleQuality(option.name)}
                >
                  {selected && <CheckmarkRegular />}
                  <span>{option.name}</span>
                  <span className="chip-count">{option.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="filter-group">
          <Text weight="semibold">字幕组</Text>
          <div className="filter-chip-list">
            {props.fansubOptions.map((option) => {
              const selected = props.fansubFilter.includes(option.name);
              return (
                <button
                  key={option.name}
                  type="button"
                  className={`filter-chip ${selected ? "selected" : ""}`}
                  onClick={() => props.onToggleFansub(option.name)}
                >
                  {selected && <CheckmarkRegular />}
                  <span>{option.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="filter-group">
          <Text weight="semibold">字幕形式</Text>
          <div className="filter-chip-list">
            {props.subtitleOptions.map((option) => {
              const selected = props.subtitleFilter.includes(option.name);
              return (
                <button
                  key={option.name}
                  type="button"
                  className={`filter-chip ${selected ? "selected" : ""}`}
                  onClick={() => props.onToggleSubtitle(option.name)}
                >
                  {selected && <CheckmarkRegular />}
                  <span>{option.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <Dialog open={registerOpen} onOpenChange={(_, data) => setRegisterOpen(data.open)}>
        <DialogSurface className="register-dialog">
          <DialogBody>
            <DialogTitle>登记新动画</DialogTitle>
            <DialogContent>
              <div className="register-form">
                <Field label="动画名称" required validationMessage={formError && !title.trim() ? formError : undefined}>
                  <Input value={title} onChange={(_, data) => setTitle(data.value)} placeholder="例如：夏日口袋" />
                </Field>
                <Field label="字幕组">
                  <Input value={fansub} onChange={(_, data) => setFansub(data.value)} placeholder="例如：桜都字幕组" />
                </Field>
                <Field label="字幕类型">
                  <Input
                    value={subtitleType}
                    onChange={(_, data) => setSubtitleType(data.value)}
                    list="subtitle-type-options"
                    placeholder="可选择或手动输入"
                  />
                  <datalist id="subtitle-type-options">
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
                    value={isFinished ? episodes : "-1"}
                    onChange={(_, data) => setEpisodes(data.value)}
                    disabled={!isFinished}
                    type="number"
                    min={1}
                    placeholder={isFinished ? "请输入正整数" : "-1"}
                  />
                </Field>
                <Field label="清晰度">
                  <Input
                    value={quality}
                    onChange={(_, data) => setQuality(data.value)}
                    list="quality-options"
                    placeholder="可选择或手动输入"
                  />
                  <datalist id="quality-options">
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
              <Button
                appearance="secondary"
                disabled={registering}
                icon={<DismissRegular />}
                onClick={() => {
                  setRegisterOpen(false);
                  resetForm();
                }}
              >
                取消
              </Button>
              <Button appearance="primary" icon={<SaveRegular />} disabled={registering} onClick={onSubmit}>
                {registering ? "保存中..." : "保存"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </section>
  );
}
