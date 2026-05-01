import '@fortawesome/fontawesome-free/css/all.css'; // Ensure you are using css-loader
import Vue from 'vue';
import Vuetify from 'vuetify';
import {TiptapVuetifyPlugin} from 'tiptap-vuetify';
import VueI18n from './i18n';

Vue.use(Vuetify);

const vuetify = new Vuetify({
  icons: {
    iconfont: 'md', // default - only for display purposes
  },
  lang: {
    t: (key, ...params) => VueI18n.t(key, params),
  },
  breakpoint: {
    // Mobile cutover at 820px (was 960). Revert by removing this breakpoint block.
    thresholds: {
      xs: 600,
      sm: 820,
      md: 1280,
      lg: 1920,
    },
    scrollBarWidth: 16,
  },
});

Vue.use(TiptapVuetifyPlugin, {
  vuetify,
  iconsGroup: 'md',
});

export default vuetify;
