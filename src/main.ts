import { createApp } from "vue";
import App from "./App.vue";

// Vuetify
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { aliases, mdi } from "vuetify/iconsets/mdi";
import "@mdi/font/css/materialdesignicons.css";

// Iconify for custom icons
import { addCollection } from "@iconify/vue";
import fluentIcons from "@iconify-json/fluent/icons.json";

import "./styles.css";

addCollection(fluentIcons);

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: { mdi },
  },
  defaults: {
    global: {
      ripple: false,
    },
    VCard: {
      variant: "flat",
      border: true,
      class: "rounded-xl",
    },
    VBtn: {
      variant: "tonal",
      class: "text-none rounded-pill",
      height: 40,
    },
    VTextField: {
      variant: "filled",
      color: "primary",
      class: "rounded-lg",
    },
    VSelect: {
      variant: "filled",
      color: "primary",
      class: "rounded-lg",
    },
    VNavigationDrawer: {
      color: "surface",
      border: "e",
    },
  },
  theme: {
    defaultTheme: "light",
    themes: {
      light: {
        dark: false,
        colors: {
          primary: "#005FAF", // Deep Blue
          secondary: "#5C5D72",
          surface: "#FDFBFF",
          "surface-variant": "#E1E2EC",
          background: "#FDFBFF",
          error: "#BA1A1A",
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: "#A9C7FF",
          secondary: "#C4C6D0",
          surface: "#1A1B1E",
          "surface-variant": "#44474F",
          background: "#1A1B1E",
          error: "#FFB4AB",
        },
      },
    },
  },
});

const app = createApp(App);
app.use(vuetify);
app.mount("#app");
