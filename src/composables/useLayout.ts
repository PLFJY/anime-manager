import { useCallback, useMemo, useState } from "react";

export type PageName = "library" | "detail" | "settings";

export const useLayout = () => {
  const [page, setPage] = useState<PageName>("library");
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [isCompact] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  const showFilters = useMemo(() => filtersOpen, [filtersOpen]);

  const navSelection = useMemo(
    () => (page === "settings" ? "settings" : "library"),
    [page]
  );

  const initLayout = useCallback(() => {
    setFiltersOpen(false);
  }, []);

  return {
    page,
    setPage,
    navCollapsed,
    setNavCollapsed,
    isCompact,
    filtersOpen,
    setFiltersOpen,
    showFilters,
    navSelection,
    animationsEnabled,
    setAnimationsEnabled,
    initLayout,
  };
};
