<template>
  <v-card width="100%" class="elevation-0 pb-0">
    <v-list class="pa-0 ma-0" v-show="postFeature && !postFeature.get('icon')">
      <v-list-item v-for="(icon, index) in postIcons" :key="index" @click="openHtmlEditor(icon)">
        <v-list-item-avatar>
          <v-img :src="icon.iconUrl" max-height="50" contain></v-img>
        </v-list-item-avatar>

        <v-list-item-content>
          <v-list-item-title v-text="icon.title"></v-list-item-title>
        </v-list-item-content>

        <v-list-item-icon>
          <v-icon>chevron_right</v-icon>
        </v-list-item-icon>
      </v-list-item>
    </v-list>
    <div v-if="(isEditingPost && postFeature && postFeature.get('icon')) || isEditingHtml">
      <v-layout justify-space-between column fill-height>
        <tip-tap-editor :map="map" v-if="postFeature || isEditingHtml" class="mx-1 mt-1">
          <template v-if="isEditingPost && postFeature && postFeature.get('icon')" v-slot:below-toolbar>
            <v-text-field
              v-model="postTitle"
              :placeholder="$t('form.htmlPostEditor.titleLabel')"
              class="mx-1 post-title-field"
              hide-details
              solo
              flat
              dense
            ></v-text-field>
          </template>
        </tip-tap-editor>
      </v-layout>
      <v-row>
        <v-spacer></v-spacer>
        <v-btn class="mt-2 mr-2 mb-2" @click="cancel" text> {{ $t('general.cancel') }} </v-btn>
        <v-btn
          :disabled="(!postFeature && isEditingPost) || [`<p></p>`, ''].includes(htmlContent)"
          class="mt-2 mr-5"
          @click="save"
          text
          color="primary"
          >{{ $t('general.save') }}</v-btn
        >
      </v-row>
    </div>
  </v-card>
</template>

<script>
import {mapGetters, mapMutations} from 'vuex';
import {mapFields} from 'vuex-map-fields';

import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Overlay from 'ol/Overlay';
import axios from 'axios';
import GeoJSON from 'ol/format/GeoJSON';
import TipTapEditor from './TipTapEditor.vue';
import {Mapable} from '../../mixins/Mapable';
import {postEditLayerStyle} from '../../style/OlStyleDefs';

import authHeader from '../../services/auth-header';
import {EventBus} from '../../EventBus';
import {addProps, getHtml} from '../../utils/Helpers';

export default {
  mixins: [Mapable],
  components: {
    'tip-tap-editor': TipTapEditor,
  },
  data() {
    return {
      // Help tooltip data
      helpMessage: '',
      helpTooltipElement: null,
      helpTooltip: null,
      postSnackbarMessages: {
        update: 'form.htmlPostEditor.update',
        delete: 'form.htmlPostEditor.delete',
        insert: 'form.htmlPostEditor.insert',
      },
      overlayersGarbageCollector: [],
      postTitle: '',
    };
  },
  created() {
    EventBus.$on('deletePost', feature => {
      let fId = feature.getId();
      if (fId.includes('clone.')) {
        // eslint-disable-next-line prefer-destructuring
        fId = fId.split('clone.')[1];
      }
      const clonedFeature = feature.clone();
      clonedFeature.setId(fId);
      this.postEditLayer.getSource().addFeature(clonedFeature);
      this.transactPost('delete');
    });
    EventBus.$on('editPost', feature => {
      let fId = feature.getId();
      if (fId.includes('clone.')) {
        // eslint-disable-next-line prefer-destructuring
        fId = fId.split('clone.')[1];
      }
      const clonedFeature = feature.clone();
      clonedFeature.setId(fId);
      this.postEditLayer.getSource().addFeature(clonedFeature);
      this.htmlContent = this.getHtml(feature.getProperties(), this.$appConfig.app.defaultLanguage, this.$i18n.locale);
      this.postTitle = clonedFeature.get('title') || '';
      this.postFeature = clonedFeature;
      this.editType = 'update';
      this.isEditingPost = true;
    });
    EventBus.$on('editHtml', html => {
      this.htmlContent = html;
      this.isEditingHtml = true;
    });
    EventBus.$on('clearEditHtml', this.cancel);
  },
  methods: {
    getHtml,
    onMapBound() {
      this.createEditPostLayer();
    },
    openHtmlEditor(icon) {
      if (this.postFeature) {
        this.postFeature.set('icon', icon.iconUrl);
      }
      this.editType = 'insert';
    },
    save() {
      if (this.isEditingPost) {
        this.transactPost(this.editType);
      } else if (this.lastSelectedLayer) {
        this.transactHtml('layer');
      } else {
        this.transactHtml('group');
      }
    },
    cancel() {
      this.postEditLayer.getSource().clear();
      this.lastSelectedLayer = null;
      this.postFeature = null;
      this.postTitle = '';
      this.isEditingPost = false;
      this.isEditingHtml = false;
    },
    closeInteraction() {
      this.postEditLayer.getSource().clear();
      this.postFeature = null;
      this.postTitle = '';
      this.htmlContent = '';

      this.clearOverlays();
    },
    createEditPostLayer() {
      // -  create an edit vector layer
      const postEditLayerSource = new VectorSource({
        wrapX: false,
      });
      const options = {
        name: 'post_edit_layer',
        isInteractive: false,
        queryable: false,
        zIndex: 10000,
        source: postEditLayerSource,
        style: postEditLayerStyle,
      };
      const postEditLayer = new VectorLayer(options);
      this.map.addLayer(postEditLayer);
      this.postEditLayer = postEditLayer;
    },

    onPointerMove(evt) {
      const {coordinate} = evt;
      this.helpTooltipElement.innerHTML = this.helpMessage;
      this.helpTooltip.setPosition(coordinate);
      this.map.getTarget().style.cursor = 'pointer';
    },

    createHelpTooltip() {
      if (this.helpTooltipElement) {
        this.helpTooltipElement.parentNode.removeChild(this.helpTooltipElement);
      }
      this.helpTooltipElement = document.createElement('div');
      this.helpTooltipElement.className = 'edit-tooltip';
      this.helpTooltip = new Overlay({
        element: this.helpTooltipElement,
        offset: [15, 15],
        positioning: 'top-left',
        stopEvent: true,
        insertFirst: false,
      });
      this.map.addOverlay(this.helpTooltip);
      this.overlayersGarbageCollector.push(this.helpTooltip);
    },
    clearOverlays() {
      if (this.overlayersGarbageCollector) {
        this.overlayersGarbageCollector.forEach(overlay => {
          this.map.removeOverlay(overlay);
        });
        this.overlayersGarbageCollector = [];
      }
    },

    ...mapMutations('map', {
      toggleSnackbar: 'TOGGLE_SNACKBAR',
    }),
    transactPost(type) {
      const language = {
        default: this.$appConfig.app.defaultLanguage || 'en',
        available: this.$i18n.availableLocales,
        active: this.$i18n.locale,
      };
      const feature = this.postEditLayer.getSource().getFeatures()[0];
      const payload = {
        type,
        srid: '4326',
        table: 'html_posts',
        geometry: new GeoJSON().writeGeometryObject(feature.getGeometry().clone().transform('EPSG:3857', 'EPSG:4326')),
        featureId: feature.getId(),
        properties: {},
        language,
      };
      if (type !== 'delete') {
        payload.properties = {
          icon: this.postFeature.get('icon'),
          group: this.activeLayerGroup.navbarGroup,
          title: this.postTitle && this.postTitle.trim() ? this.postTitle.trim() : this.postIconTitle,
          titleTranslations: this.postFeature.get('titleTranslations') || {},
          html: this.htmlContent,
          htmlTranslations: this.postFeature.get('htmlTranslations') || {},
          createdBy: null, // The value is added from the api
          updatedBy: null, // The value is added from the api,
          createdAt: null, // The value is added from the api,
          updatedAt: null, // The value is added from the api,
        };
        payload.originalProperties = this.postFeature.clone().getProperties();
      }
      const formData = new FormData();
      formData.append('payload', JSON.stringify(payload));
      axios
        .post('api/layer', formData, {
          headers: authHeader(),
          // Without this, a server-side failure that never sends a response
          // (e.g. an unhandled error mid-request) leaves this promise pending
          // forever with zero feedback -- this bounds that to a finite wait
          // instead of an indefinite hang.
          timeout: 30000,
        })
        .then(() => {
          this.cancel();
          // Clear the popup's reference to the edited feature BEFORE refreshing
          // the layer's source -- refresh() clears the source's features
          // immediately (well before the new ones load), so leaving
          // popup.activeFeature pointing at the just-edited feature for even a
          // moment risks anything reading it hitting a feature that's already
          // been ripped out of its layer.
          EventBus.$emit('closePopupInfo');
          const htmlPostLayer = this.layers.html_posts;
          if (htmlPostLayer) {
            htmlPostLayer.getSource().refresh();
          }
          setTimeout(() => {
            this.toggleSnackbar({
              type: 'success',
              message: this.$t(this.postSnackbarMessages[type]),
              timeout: 2000,
              state: true,
            });
          }, 50);
        })
        .catch(error => {
          // Deliberately does NOT call cancel()/closePopupInfo here -- on
          // failure the user's edits should stay visible so they can retry
          // rather than silently losing them.
          console.error('Failed to save post:', error);
          this.toggleSnackbar({
            type: 'error',
            message: this.$t('form.htmlPostEditor.saveFailed'),
            timeout: 4000,
            state: true,
          });
        });
    },
    transactHtml(type) {
      let req;
      const language = {
        default: this.$appConfig.app.defaultLanguage || 'en',
        available: this.$i18n.availableLocales,
        active: this.$i18n.locale,
      };
      if (type === 'layer') {
        const payload = {
          type: 'layer',
          name: this.lastSelectedLayer,
          html: this.htmlContent,
          language,
        };
        if (this.sidebarHtml.layers[this.lastSelectedLayer]) {
          req = axios.patch('api/html', payload, {
            headers: authHeader(),
          });
        } else {
          req = axios.post('api/html', payload, {
            headers: authHeader(),
          });
        }
      } else {
        const payload = {
          type: 'group',
          name: this.groupName,
          html: this.htmlContent,
          language,
        };
        if (this.sidebarHtml.groups[this.groupName]) {
          req = axios.patch('api/html', payload, {
            headers: authHeader(),
          });
        } else {
          req = axios.post('api/html', payload, {
            headers: authHeader(),
          });
        }
      }
      req.then(response => {
        setTimeout(() => {
          this.toggleSnackbar({
            type: 'success',
            message: this.$t('general.updateSuccess'),
            timeout: 2000,
            state: true,
          });
          if (type === 'layer') {
            const {layers} = this.sidebarHtml;
            Object.keys(response.data).forEach(key => {
              addProps(layers, `${this.lastSelectedLayer}.${key}`, response.data[key]);
            });
            addProps(layers, `${this.lastSelectedLayer}.type`, 'layer');
          } else {
            const {groups} = this.sidebarHtml;
            Object.keys(response.data).forEach(key => {
              addProps(groups, `${this.groupName}.${key}`, response.data[key]);
            });
            addProps(groups, `${this.groupName}.type`, 'group');
          }
          // Clear.
          EventBus.$emit('closePopupInfo');
          this.cancel();
        }, 50);
      });
    },
  },
  computed: {
    ...mapGetters('app', {
      sidebarHtml: 'sidebarHtml',
      postIcons: 'postIcons',
    }),
    ...mapFields('map', {
      popup: 'popup',
      htmlContent: 'htmlContent',
      isEditingPost: 'isEditingPost',
      isEditingHtml: 'isEditingHtml',
      postEditLayer: 'postEditLayer',
      postFeature: 'postFeature',
      editType: 'postEditType',
      lastSelectedLayer: 'lastSelectedLayer',
    }),
    ...mapGetters('map', {
      layers: 'layers',
      activeLayerGroup: 'activeLayerGroup',
      groupName: 'groupName',
    }),
    postIconTitle() {
      if (this.postFeature && this.postFeature.get('icon')) {
        const icon = this.postIcons.filter(i => i.iconUrl === this.postFeature.get('icon'));
        return icon.length > 0 ? icon[0].title : '';
      }
      return '';
    },
  },
  watch: {
    isEditingPost(value) {
      if (value !== true) {
        this.editType = null;
        this.closeInteraction();
      }
    },
  },
};
</script>

<style scoped>
.post-title-field ::v-deep input::placeholder {
  font-style: italic;
}
</style>
