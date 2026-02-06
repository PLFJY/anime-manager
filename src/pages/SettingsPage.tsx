import { Button, Card, Field, Input, Radio, RadioGroup, Switch, Text, Title2 } from "@fluentui/react-components";
import type { ThemeMode } from "../composables/useSettings";

interface SettingsPageProps {
  active: boolean;
  baseDir: string;
  themeMode: ThemeMode;
  accentColor: string;
  autoRefresh: boolean;
  loading: boolean;
  onBaseDirChange: (value: string) => void;
  onThemeModeChange: (value: ThemeMode) => void;
  onAccentColorChange: (value: string) => void;
  onAutoRefreshChange: (value: boolean) => void;
  onRefresh: () => void;
  onLoad: () => void;
}

export default function SettingsPage(props: SettingsPageProps) {
  return (
    <section className={`page settings-page ${props.active ? "active" : ""}`} aria-hidden={!props.active}>
      <div className="page-container">
        <header className="page-header">
          <Title2>设置</Title2>
          <p className="subtitle">管理库目录、主题和更新策略。</p>
        </header>

        <div className="settings-grid">
          <Card className="settings-card">
            <Title2>库目录</Title2>
            <Field label="库目录路径">
              <Input
                value={props.baseDir}
                onChange={(_, data) => props.onBaseDirChange(data.value)}
                placeholder="例如：F:\\Videos"
              />
            </Field>
            <div className="settings-actions">
              <Button appearance="primary" disabled={props.loading} onClick={props.onRefresh}>
                手动更新库
              </Button>
              <Button disabled={props.loading} onClick={props.onLoad}>
                读取缓存
              </Button>
            </div>
            <Text size={200}>缓存数据库存放在库目录下的 anime-manager.sqlite。</Text>
          </Card>

          <Card className="settings-card">
            <Title2>主题与色彩</Title2>
            <Field label="深浅模式">
              <RadioGroup
                value={props.themeMode}
                onChange={(_, data) => props.onThemeModeChange(data.value as ThemeMode)}
              >
                <Radio value="system" label="跟随系统" />
                <Radio value="light" label="浅色" />
                <Radio value="dark" label="深色" />
              </RadioGroup>
            </Field>
            <div className="settings-row">
              <label htmlFor="accent-color">强调色</label>
              <input
                id="accent-color"
                type="color"
                className="accent-picker"
                value={props.accentColor}
                onChange={(event) => props.onAccentColorChange(event.target.value)}
              />
              <Input
                value={props.accentColor}
                onChange={(_, data) => props.onAccentColorChange(data.value)}
              />
            </div>
          </Card>

          <Card className="settings-card">
            <Title2>更新策略</Title2>
            <Switch
              checked={props.autoRefresh}
              onChange={(_, data) => props.onAutoRefreshChange(Boolean(data.checked))}
              label="启动时自动更新"
            />
          </Card>
        </div>
      </div>
    </section>
  );
}
