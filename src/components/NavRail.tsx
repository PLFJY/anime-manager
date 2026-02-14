import { Button, Tab, TabList, Text } from "@fluentui/react-components";
import {
  LibraryRegular,
  PanelLeftContractRegular,
  PanelLeftExpandRegular,
  SettingsRegular,
} from "@fluentui/react-icons";

type NavSelection = "library" | "settings";

interface NavRailProps {
  collapsed: boolean;
  selection: NavSelection;
  onToggle: () => void;
  onSelect: (value: NavSelection) => void;
}

export default function NavRail({
  collapsed,
  selection,
  onToggle,
  onSelect,
}: NavRailProps) {
  const navValue = selection === "settings" ? "settings" : "library";

  return (
    <aside className={`nav-rail ${collapsed ? "" : "expanded"}`}>
      <div className="nav-brand">
        <div className="brand-icon">AM</div>
        {!collapsed && (
          <div className="brand-text">
            <div className="brand-title">Anime Manager</div>
            <Text size={200} className="brand-sub">
              Fluent UI · React
            </Text>
          </div>
        )}
      </div>

      <TabList
        vertical
        selectedValue={navValue}
        className="nav-tabs"
        onTabSelect={(_, data) => onSelect(data.value === "settings" ? "settings" : "library")}
      >
        <Tab
          value="library"
          icon={<LibraryRegular />}
          aria-label="资源库"
        >
          {!collapsed ? "资源库" : null}
        </Tab>
        <Tab
          value="settings"
          icon={<SettingsRegular />}
          aria-label="设置"
        >
          {!collapsed ? "设置" : null}
        </Tab>
      </TabList>

      <div className="nav-footer">
        <Button
          appearance="subtle"
          icon={
            collapsed ? <PanelLeftExpandRegular /> : <PanelLeftContractRegular />
          }
          onClick={onToggle}
        >
          {!collapsed ? "收起" : null}
        </Button>
      </div>
    </aside>
  );
}
