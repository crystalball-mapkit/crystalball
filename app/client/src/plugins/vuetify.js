import '@fortawesome/fontawesome-free/css/all.css'; // Ensure you are using css-loader
import Vue from 'vue';
import Vuetify from 'vuetify';
import {TiptapVuetifyPlugin} from 'tiptap-vuetify';
import VueI18n from './i18n';

Vue.use(Vuetify);

const vuetify = new Vuetify({
  theme: {
    themes: {
      light: {
        anchor: '#67BC55',
        black: '#000000',
        purple: '#CF00E8',
      },
    },
  },
  icons: {
    iconfont: 'md', // default - only for display purposes
  },
  lang: {
    t: (key, ...params) => VueI18n.t(key, params),
  },
});

Vue.use(TiptapVuetifyPlugin, {
  vuetify,
  iconsGroup: 'md',
});

export default vuetify;

