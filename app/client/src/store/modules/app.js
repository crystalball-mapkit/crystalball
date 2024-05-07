import axios from 'axios';
import {getField, updateField} from 'vuex-map-fields';

const state = {
  sidebarState: true,
  sidebarHtml: {},
  postIcons: [],
  config: {},
  serverConfig: {}, // TODO: Migrate all config settings here. (read from api endpoint)
  geoserverConfig: {},
  appConfig: {},
};

// mutations are operations that actually mutates the state.
// each mutation handler gets the entire state tree as the
// first argument, followed by additional payload arguments.
// mutations must be synchronous and can be recorded by plugins
// for debugging purposes.
const mutations = {
  toggle(state) {
    // console.log('store toggle!!')
    state.sidebarState = !state.sidebarState;
  },
  setSidebarInitialState(state, initialState) {
    state.sidebarState = initialState;
  },
  getIconsSuccess(state, icons) {
    state.postIcons = icons;
  },
  getIconsFailure(state) {
    state.postIcons = [];
  },
  updateField,
};

const actions = {
  toggle(context) {
    context.commit('toggle');
  },
  getIcons({commit}) {
    axios
      .get('/api/icons')
      .then(response => {
        commit('getIconsSuccess', response.data);
      })
      .catch(() => {
        commit('getIconsFailure');
      });
  },
};

// getters are functions
const getters = {
  sidebarState: state => state.sidebarState,
  sidebarHtml: state => state.sidebarHtml,
  serverConfig: state => state.serverConfig,
  appConfig: state => state.appConfig,
  icons: state => state.postIcons,
  postIcons: (state, getters, rootState, rootGetters) => {
    const activeGroup = rootGetters['map/activeLayerGroup'].navbarGroup;
    const filteredIcons = state.postIcons.filter(i => i.group.includes(activeGroup) || i.group === 'all');
    return filteredIcons;
  },
  getField,
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
