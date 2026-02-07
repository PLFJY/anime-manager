import { Badge, Button, Card, Input, Spinner, Text, Title2 } from "@fluentui/react-components";
import { CheckmarkRegular, DismissRegular, FilterRegular } from "@fluentui/react-icons";
import { useEffect, useRef } from "react";
import type { LibraryEntry } from "../types";

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
}

export default function LibraryPage(props: LibraryPageProps) {
  const pageClass = `page library-page ${props.active ? "active" : ""}`;
  const loadingText = props.loadingAction === "refresh" ? "正在更新缓存..." : "正在读取缓存...";
  const drawerRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

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

  return (
    <section className={pageClass} aria-hidden={!props.active}>
      <div className="page-container">
        <header className="page-header">
          <Title2>动漫资源管理台</Title2>
          <p className="subtitle">Anime Library / Fluent UI</p>
          <p className="subtitle">通过 SQLite 缓存本地 manifest.yml，并提供轻量级资源浏览。</p>
          <p className="subtitle">当前库目录：{props.baseDir}</p>
        </header>

        <Card className="controls-bar">
          <Input
            value={props.search}
            onChange={(_, data) => props.onSearchChange(data.value)}
            placeholder="搜索标题 / 字幕组 / 画质"
          />
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
                              {item.episodes && <Badge>{item.episodes}</Badge>}
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
    </section>
  );
}
