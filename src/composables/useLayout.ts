import { computed, ref } from "vue";

export type PageName = "library" | "detail" | "settings";

const compactMedia = window.matchMedia("(max-width: 1100px)");

export const useLayout = () => {
  const page = ref<PageName>("library");
  const navCollapsed = ref(false);
  const isCompact = ref(compactMedia.matches);
  const filtersOpen = ref(!compactMedia.matches);
  const animationsEnabled = ref(true);

  const showFilters = computed(() =>
    isCompact.value ? filtersOpen.value : true
  );
  const navSelection = computed(() =>
    page.value === "settings" ? "settings" : "library"
  );

  const initLayout = () => {
    isCompact.value = compactMedia.matches;
    filtersOpen.value = !compactMedia.matches;
  };

  compactMedia.addEventListener("change", (event) => {
    isCompact.value = event.matches;
    filtersOpen.value = event.matches ? false : true;
  });

  return {
    page,
    navCollapsed,
    isCompact,
    filtersOpen,
    showFilters,
    navSelection,
    animationsEnabled,
    initLayout,
  };
};
