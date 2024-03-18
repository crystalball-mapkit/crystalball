import Vue from 'vue';
import './plugins/vuescroll';

import VueCookies from 'vue-cookies';
import VueLazyLoad from 'vue-lazyload';
import axios from 'axios';
import App from './App.vue';
import appStore from './store/modules/app';
import InfoPopUp, {infoPopUpName} from './components/core/InfoPopUp.vue';
import vuetify from './plugins/vuetify';
import store from './store/index';
import router, {getRoutes} from './router';
import i18n from './plugins/i18n';
import 'ol/ol.css';
import './assets/scss/app.scss';
import 'material-design-icons/iconfont/material-icons.css';
import 'vue-image-lightbox/dist/vue-image-lightbox.min.css';

Vue.config.productionTip = false;

const appSelector = '#app';
const appEl = document.querySelector('#app');
const touch = matchMedia('(hover: none)').matches;
Vue.prototype.$isTouch = touch;

Vue.prototype.$isEmbedded = appEl.hasAttribute('embedded');

Vue.use(VueLazyLoad);
Vue.use(VueCookies);
Vue.component(infoPopUpName, InfoPopUp);

const getIcons = axios.get('./api/icons');
const getSidebarHtml = axios.get('./api/html');
const serverConfig = axios.get('./api/config');
axios
  .all([getSidebarHtml, getIcons, serverConfig])
  .then(
    axios.spread((...responses) => {
      const sidebarHtml = responses[0];
      const postIcons = responses[1];
      const serverConfig = responses[2];
      if (sidebarHtml.data) {
        appStore.state.sidebarHtml = sidebarHtml.data;
      }
      if (postIcons.data) {
        appStore.state.postIcons = postIcons.data;
      }
      if (serverConfig.data) {
        appStore.state.serverConfig = serverConfig.data;
      }
    })
  )
  .catch(() => {
    // react on errors.
  });

// App Configuration
// eslint-disable-next-line no-undef
// fetch('./static/app-conf.json')
fetch('https://midwayfair.s3.us-east-2.amazonaws.com/assets/settings/app-conf.json')
  .then(response => {
    if (response.status !== 200) {
      console.log(`Looks like there was a problem. Status Code: ${response.status}`);
      return;
    }

    // Examine the text in the response
    response.json().then(data => {
      // Make app config accessible for all components
      router.addRoutes(getRoutes(data));
      Vue.prototype.$appConfig = data;
      appStore.state.appConfig = data;
      // change language if set in app config
      if (data.app.defaultLanguage) {
        i18n.locale = data.app.defaultLanguage;
      }
      new Vue({
        router,
        i18n,
        store,
        vuetify,
        render: h => h(App),
      }).$mount('#app');
    });
  })
  .catch(err => {
    console.log('Fetch Error :-S', err);
  });

// eslint-disable-next-line import/prefer-default-export
export {appSelector};
