/* eslint-disable no-param-reassign */
import {getField, updateField} from 'vuex-map-fields';
import axios from 'axios';
import colormap from 'colormap';
import {Group as LayerGroup} from 'ol/layer';
import {formatPopupRows, getLayerSourceUrl, extractGeoserverLayerNames, getAllChildLayers} from '../../utils/Layer';
import http from '../../services/http';

const state = {
  map: null,
  messages: {
    snackbar: {
      type: 'info',
      message: '',
      state: false,
      timeout: 2000,
    },
  },
  popup: {
    highlightLayer: null,
    worldExtentLayer: null,
    highlightVectorTileLayer: null,
    selectedCorpNetworkLayer: null,
    popupOverlay: null,
    title: 'Info',
    isVisible: false,
    activeFeature: null,
    activeLayer: null,
    exludedProps: ['id', 'geometry', 'geom', 'orgin_geometry', 'osm_id', 'gid', 'layerName'],
    diveVisibleProps: ['title', 'entity'],
    showInSidePanel: false,
  },
  layers: {}, // Only for operational layers
  activeLayerGroup: null,
  colorMapEntities: {}, // Fetched from geoserver
  geoserverLayerNames: null, // Created when user clicks corporate network,
  geoserverWorkspace: 'workspace1',
  layersMetadata: {}, // Describe feature type.
  layersWithEntityField: null, // Fetched from Geoserver on load
  selectedCoorpNetworkEntity: null, // Selected entity,
  navbarGroups: [],
  // Uncomment to activate Local/Global buttons
  regions: [],
  previousMapPosition: null,
  previousMapPositionSearch: null,
  isEditingLayer: false,
  selectedLayer: null, // Selected layer for editing
  isEditingPost: false,
  isEditingHtml: false,
  htmlContent: '',
  htmlPostLayerConf: {
    type: 'VECTOR',
    name: 'html_posts',
    queryable: true,
    displayInLegend: false,
    legendDisplayName: 'Posts',
    format: 'GeoJSON',
    visible: true,
    zIndex: 100,
    minResolution: 0.25,
    maxResolution: 800,
    label: null,
    hoverable: true,
    canEdit: false,
    style: {
      styleRef: 'htmlLayerStyle',
      hoverTextColor: 'white',
      hoverBackgroundColor: 'rgba(0,0,0,0.5)',
    },
  },
  postEditLayer: null, // user for
  postFeature: null,
  postEditType: null,
  lastSelectedLayer: null, // triggered from layer or group change
  persistentLayers: {},
  currentResolution: null,
  mobilePanelState: true,
  lightboxDialogState: false,
  // EDITOR
  formValid: true,
  formSchema: {
    type: 'object',
    required: [],
    properties: {},
  },
  formSchemaCache: {},
  formOptions: {
    debug: false,
    disableAll: false,
    autoFoldObjects: true,
  },
  formData: {},
  imageUpload: {
    defaultButtonText: 'Upload',
    selectedFile: null,
    isSelecting: false,
    errorMessage: '',
    position: 'sidebarMediaTop',
  },
  editType: null,
  editLayer: null,
  highlightLayer: null,
  isTranslating: false,
};

const getters = {
  map: state => state.map,
  layers: state => state.layers,
  messages: state => state.messages,
  snackbar: state => state.messages.snackbar,
  activeLayerGroup: state => state.activeLayerGroup,
  popup: state => state.popup,
  isEditingLayer: state => state.isEditingLayer,
  selectedLayer: state => state.selectedLayer,
  isEditingHtml: state => state.isEditingHtml,
  isEditingPost: state => state.isEditingPost,
  popupInfo: state => {
    const feature = state.popup.activeFeature;
    if (!feature) return;
    return formatPopupRows(feature, state.popup.exludedProps);
  },
  translations: state => {
    const feature = state.popup.activeFeature;
    if (!feature) return;
    return feature.getProperties().translations ? JSON.parse(feature.getProperties().translations) : null;
  },
  splittedEntities: state => {
    if (state.selectedCoorpNetworkEntity) {
      const splittedString = state.selectedCoorpNetworkEntity.split(',').map(str => {
        if (str.charAt(0) === ' ') {
          str = str.slice(1);
        }
        str = str.split(' ').slice(0, 2).join(' ');
        return str;
      });
      return splittedString;
    }
    return null;
  },
  geoserverWorkspace: state => state.geoserverWorkspace,
  navbarGroups: state => state.navbarGroups,
  regions: state => state.regions,
  layersMetadata: state => state.layersMetadata,
  htmlContent: state => state.htmlContent,
  htmlPostLayerConf: state => {
    const config = state.htmlPostLayerConf;
    config.url = `./geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=${state.geoserverWorkspace}:html_posts&outputFormat=application/json&srsname=EPSG:3857`;
    return config;
  },
  persistentLayers: state => state.persistentLayers,
  postEditLayer: state => state.postEditLayer,
  lastSelectedLayer: state => state.lastSelectedLayer,
  appConfGroups_: state => state.appConfGroups_,
  postIconTitle: (state, getters, rootState, rootGetters) => {
    if (state.popup.activeFeature && state.popup.activeFeature.get('icon')) {
      const icon = rootGetters['app/postIcons'].filter(i => i.iconUrl == state.popup.activeFeature.get('icon'));

      return icon.length > 0 ? icon[0].title : '';
    }
    return '';
  },
  groupName: state => {
    if (!state.activeLayerGroup) {
      return '';
    }
    return `${state.activeLayerGroup.navbarGroup}_${state.activeLayerGroup.region}`;
  },
  visibleGroup: (state, getters, rootState) => {
    if (rootState.app.appConfig.app.customNavigationScheme == '2') {
      const navbarGroup = rootState.app.appConfig.map.groups[state.activeLayerGroup.navbarGroup];
      navbarGroup.layers = rootState.app.appConfig.map.buttons[state.activeLayerGroup.region];
      return navbarGroup;
    }
    return rootState.app.appConfig.map.groups[state.activeLayerGroup.navbarGroup][state.activeLayerGroup.region];
  },
  currentResolution: state => state.currentResolution,
  postFeature: state => state.postFeature,
  mobilePanelState: state => state.mobilePanelState,
  lightboxDialogState: state => state.lightboxDialogState,
  imageUploadButtonText: state =>
    state.imageUpload.selectedFile ? state.imageUpload.selectedFile.name : state.imageUpload.defaultButtonText,
  editLayer: state => state.editLayer,
  editType: state => state.editType,
  imageUpload: state => state.imageUpload,
  highlightLayer: state => state.highlightLayer,
  getField,
  isTranslating: state => state.isTranslating,
};

const actions = {
  fetchColorMapEntities({commit, rootState}) {
    // eslint-disable-next-line no-undef
    if (!rootState.map.colorMapEntities) {
      return;
    }
    const layers = {};
    Object.keys(rootState.map.layers).forEach(key => {
      const layer = rootState.map.layers[key];
      if (layer instanceof LayerGroup) {
        const layersArray = layer.getLayers().getArray();
        layersArray.forEach(l => {
          layers[l.get('name')] = l;
        });
      } else {
        layers[layer.get('name')] = layer;
      }
    });
    const promiseArray = [];
    Object.keys(layers).forEach(key => {
      const layer = layers[key];
      if (layer.get('styleObj')) {
        const styleObj = JSON.parse(layer.get('styleObj'));
        if (!styleObj.stylePropFnRef) return;
        if (
          styleObj.stylePropFnRef.fillColorFn !== 'colorMapStyle' ||
          rootState.map.colorMapEntities[layer.get('name')]
        )
          return;
        const tableName =
          styleObj.tableName ||
          extractGeoserverLayerNames([
            {
              url: getLayerSourceUrl(layer.getSource()),
              name: layer.get('name'),
            },
          ])[rootState.map.geoserverWorkspace].names[0];
        let viewParams = `viewparams=table:${tableName}`;
        if (styleObj.stylePropFnRef.fillColor) {
          viewParams += `;field:${styleObj.stylePropFnRef.fillColor}`;
        }
        const url = `./geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=${rootState.map.geoserverWorkspace}:colormap&srsname=EPSG:4326&${viewParams}&outputFormat=json`;
        promiseArray.push(
          http.get(url, {
            data: {
              layerName: layer.get('name'),
              colormap: styleObj.stylePropFnRef.fillColorMap || 'portland',
              nshades: styleObj.stylePropFnRef.fillColorMapNshades,
            },
          })
        );
      }
    });
    if (promiseArray.length > 0) {
      axios
        .all(promiseArray)
        .then(results => {
          results.forEach(response => {
            const features = response.data.features;
            const configData = JSON.parse(response.config.data);
            const layerName = configData.layerName;
            if (features && features.length === 0) {
              return;
            }
            const nshades = configData.nshades || features.length;
            const entities = {};
            const colors = colormap({
              colormap: configData.colormap,
              nshades,
              format: 'hex',
              alpha: 1,
            });

            const ratio = Math.ceil(features.length / nshades);
            features.forEach((feature, index) => {
              const entity = feature.properties.entity;
              entities[entity] = colors[Math.floor(index / ratio)];
            });

            commit('SET_COLORMAP_VALUES', {layerName, entities});
            const layers = getAllChildLayers(state.map);
            layers.forEach(layer => {
              if (layer.get('name') === layerName) {
                layer.changed();
              }
            });
          });
        })
        .catch(err => {
          console.log('Fetch Error :-S', err);
        });
    }
  },
};

const mutations = {
  TOGGLE_SNACKBAR(state, payload) {
    Object.assign(state.messages.snackbar, payload);
  },
  SET_LAYER(state, layer) {
    if (layer.get('name')) {
      if (!state.layers[layer.get('name')]) {
        state.map.addLayer(layer);
      }
      state.layers[layer.get('name')] = layer;
    }
  },
  SET_PERSISTENT_LAYER(state, layer) {
    if (layer.get('name')) {
      state.persistentLayers[layer.get('name')] = layer;
      state.map.addLayer(layer);
    }
  },
  SET_MAP(state, map) {
    state.map = map;
  },
  SET_ACTIVE_LAYERGROUP(state, activeLayerGroup) {
    state.activeLayerGroup = activeLayerGroup;
  },
  REMOVE_ALL_LAYERS(state) {
    const layers = [...state.map.getLayers().getArray()];
    layers.forEach(layer => {
      // Doesn't remove edit layer but clears it instead. .
      if (!['edit_layer', 'highlight_layer', 'post_edit_layer', 'html_posts'].includes(layer.get('name'))) {
        state.map.removeLayer(layer);
      } else if (layer.getSource().clear) {
        layer.getSource().clear();
      }
    });
    state.layers = {};
  },
  SET_COLORMAP_VALUES(state, payload) {
    state.colorMapEntities[payload.layerName] = payload.entities;
  },
  updateField,
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
