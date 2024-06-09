<template>
  <div class="mt-4 mb-2">
    <div v-if="Array.isArray(loggedUser.roles) && !loggedUser.roles.includes('guest_user')">
      <v-layout>
        <v-spacer></v-spacer>
        <div v-if="!selectedLayer">
          <v-tooltip left>
            <template v-slot:activator="{on}">
              <v-btn class="edit-buttons" v-on="on" @click="activateEdit" :color="color.primary" fab dark small>
                <v-icon small>far fa-edit</v-icon>
              </v-btn>
            </template>
            <span>{{ $t('tooltip.edit') }}</span>
          </v-tooltip>
        </div>

        <v-menu
          v-if="selectedLayer"
          class="edit-buttons"
          origin="center center"
          offset-y
          :nudge-bottom="5"
          transition="slide-y-transition"
        >
          <template v-slot:activator="{on, attrs}">
            <v-btn v-bind="attrs" v-on="on" class="edit-buttons" dark rounded :color="color.primary">
              <v-icon small left>far fa-edit</v-icon>
              {{
                selectedLayer
                  ? selectedLayer.get('legendDisplayName')[$i18n.locale] ||
                    (typeof selectedLayer.get('legendDisplayName') === 'object' &&
                      Object.values(selectedLayer.get('legendDisplayName'))[0]) ||
                    selectedLayer.get('legendDisplayName')
                  : ''
              }}
            </v-btn>
          </template>

          <v-list dense>
            <v-list-item @click="changeLayer">
              <v-list-item-icon>
                <v-icon>layers</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>{{ $t(`form.edit.selectLayerToEdit`) }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <v-list-item @click="closeEdit">
              <v-list-item-icon>
                <v-icon>close</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>{{ $t(`form.edit.closeEdit`) }}</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-layout>
    </div>
    <div v-if="!selectedLayer">
      <v-tooltip left>
        <template v-slot:activator="{on}">
          <v-btn
            class="edit-buttons mt-2"
            v-on="on"
            @click="togglePostEdit"
            :color="isEditingPost ? 'error' : color.primary"
            fab
            dark
            small
          >
            <v-icon small>{{ isEditingPost ? 'close' : 'fas fa-map-pin' }}</v-icon>
          </v-btn>
        </template>
        <span>{{ isEditingPost ? $t('general.close') : $t('tooltip.addPost') }}</span>
      </v-tooltip>
    </div>
    <div v-if="selectedLayer">
      <div v-for="(item, index) in editButtons" :key="index">
        <v-layout>
          <v-spacer></v-spacer>
          <v-tooltip left>
            <template v-slot:activator="{on}">
              <v-btn
                class="edit-buttons mt-2"
                v-on="on"
                fab
                dark
                right
                x-small
                v-if="!!item.enabled"
                :color="isEditingPost ? color.activeButton : color.primary"
                @click="edit(item.action)"
              >
                <v-icon medium>{{ item.icon }}</v-icon>
              </v-btn>
            </template>
            <span>{{ $t(`tooltip.${item.tooltip}`) }}</span>
          </v-tooltip>
        </v-layout>
      </div>
    </div>

    <!-- SELECT LAYER DIALOG -->
    <v-dialog v-model="layersDialog" max-width="350" @keydown.esc="layersDialog = false">
      <v-card>
        <v-app-bar flat :color="color.primary" height="50" dark>
          <v-icon class="mr-3">layers</v-icon>
          <v-toolbar-title>{{ $t(`form.edit.selectLayer`) }}</v-toolbar-title>
        </v-app-bar>

        <v-select
          class="mx-4 my-2"
          :items="
            flatLayers.filter(
              l =>
                ['VECTORTILE', 'VECTOR'].includes(l.get('type')) &&
                l.get('name') &&
                l.get('legendDisplayName') &&
                l.get('canEdit') !== false
            )
          "
          v-model="dialogSelectedLayer"
          return-object
          item-value="values_.name"
          :label="$t(`general.layers`)"
        >
          <template slot="selection" slot-scope="{item}">
            {{
              item.get('legendDisplayName')[$i18n.locale] ||
              (typeof item.get('legendDisplayName') === 'object' && Object.values(item.get('legendDisplayName'))[0]) ||
              item.get('legendDisplayName')
            }}
          </template>
          <template slot="item" slot-scope="{item}">
            {{
              item.get('legendDisplayName')[$i18n.locale] ||
              (typeof item.get('legendDisplayName') === 'object' && Object.values(item.get('legendDisplayName'))[0]) ||
              item.get('legendDisplayName')
            }}
          </template>
        </v-select>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="primary darken-1"
            text
            :disabled="!dialogSelectedLayer"
            @click.native="
              removeInteraction();
              selectedLayer = dialogSelectedLayer;
              layersDialog = false;
            "
            >{{ $t('general.ok') }}
          </v-btn>
          <v-btn :color="color.primary" text @click.native="layersDialog = false">{{ $t('general.cancel') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- LIGHTBOX DIALOG -->
    <lightbox-dialog></lightbox-dialog>
    <!-- POPUP OVERLAY  -->
    <overlay-popup
      v-if="!$vuetify.breakpoint.smAndDown"
      style="cursor: default"
      :title="popup.title"
      v-show="popup.isVisible"
      ref="popup"
    >
      <v-btn icon>
        <v-icon>close</v-icon>
      </v-btn>
      <template v-slot:close>
        <v-btn @click="popupCancel()" icon>
          <v-icon>close</v-icon>
        </v-btn>
      </template>
      <template v-slot:body>
        <div v-if="editType === 'deleteFeature'">
          <b>{{ $t(`form.edit.confirmDeleteFeature`) }}</b>
        </div>
        <div v-else-if="['addFeature', 'modifyAttributes'].includes(editType)">
          <vue-scroll ref="vs">
            <div style="max-height: 280px" class="pr-2">
              <v-flex class="d-flex flex-row justify-space-between" v-if="isTranslatable">
                <v-checkbox class="layer-input ml-0 pt-1 py-0 my-0" dense color="purple" v-model="showAllTranslations">
                  <template v-slot:label>
                    <span
                      :class="{
                        'text--darken-2 subtitle-2': true,
                        'blue--text': false,
                      }"
                    >
                      Show All Translations
                    </span>
                  </template>
                </v-checkbox>
                <v-tooltip top>
                  <template v-slot:activator="{on}">
                    <v-btn
                      v-on="on"
                      :class="{
                        'tiptap-vuetify-editor__action-render-btn': true,
                      }"
                      small
                      icon
                      @click="translateAttributes"
                    >
                      <v-icon>translate</v-icon>
                    </v-btn>
                  </template>
                  {{ $t(`form.htmlPostEditor.translateContent`) }}
                </v-tooltip>
              </v-flex>
              <v-form ref="edit-form" v-model="formValid">
                <editor-form v-model="formData" :schema="formSchema" :options="formOptions">
                  <template slot="lightbox-append">
                    <v-tooltip left>
                      <template v-slot:activator="{on}">
                        <v-btn
                          style="cursor: pointer"
                          v-on="on"
                          @click="lightboxDialogState = true"
                          class="mx-2 mb-2 lock-button elevation-1"
                          depressed
                          fab
                          small
                        >
                          <v-icon> fas fa-image</v-icon>
                        </v-btn>
                      </template>
                      <span>{{ $t('form.edit.lightBoxImagesPanel') }}</span>
                    </v-tooltip>
                  </template>
                </editor-form>
              </v-form>
            </div>
          </vue-scroll>
        </div>
      </template>
      <template v-slot:actions>
        <div v-show="editType !== 'deleteFeature'">
          <div v-show="!imageUpload.errorMessage">
            <v-tooltip top>
              <template v-slot:activator="{on}">
                <v-btn v-on="on" rounded small depressed :loading="imageUpload.isSelecting" @click="openImageUpload">
                  <v-icon left> insert_photo</v-icon>
                  <span class="image-upload-btn">
                    {{ imageUploadButtonText }}
                  </span>
                </v-btn>
              </template>
              <span>{{ $t('form.edit.uploadImage') }}</span>
            </v-tooltip>
            <input ref="imageUploader" class="d-none" type="file" accept="image/*" @change="onFileUploadChanged" />
            <v-btn v-if="imageUpload.selectedFile" class="ml-1" @click="clearUploadImage()" small icon>
              <v-icon small>close</v-icon>
            </v-btn>
          </div>
          <div v-if="imageUpload.errorMessage" class="red--text text--lighten-1 subtitle-2">
            {{ imageUpload.errorMessage }}
          </div>

          <div v-if="imageUpload.selectedFile">
            <v-menu class="mt-2" origin="center center" transition="scale-transition">
              <template v-slot:activator="{on, attrs}">
                <v-btn class="mt-2" rounded small depressed v-on="on" v-bind="attrs">
                  <v-icon left
                    >{{ imageUpload.position === 'sidebarMediaTop' ? 'picture_in_picture' : 'picture_in_picture_alt' }}
                  </v-icon>
                  <span
                    >{{ $t(`general.sidebar`) }}:
                    {{ imageUpload.position === 'sidebarMediaTop' ? $t(`general.top`) : $t(`general.bottom`) }}</span
                  >
                </v-btn>
              </template>
              <v-list dense>
                <v-list-item
                  @click="
                    imageUpload.position === 'sidebarMediaTop'
                      ? (imageUpload.position = 'sidebarMediaBottom')
                      : (imageUpload.position = 'sidebarMediaTop')
                  "
                >
                  <v-list-item-content>
                    <v-list-item-title
                      >{{ imageUpload.position === 'sidebarMediaTop' ? $t(`general.bottom`) : $t(`general.top`) }}
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </div>

        <v-spacer></v-spacer>
        <template v-if="editType === 'deleteFeature'">
          <v-btn color="primary darken-1" @click="popupOk" text>{{ $t(`general.yes`) }}</v-btn>
          <v-btn color="grey" text @click="popupCancel">{{ $t(`general.cancel`) }}</v-btn>
        </template>
        <template v-else-if="['addFeature', 'modifyAttributes'].includes(editType)">
          <v-btn color="primary darken-1" :disabled="formValid === false" @click="popupOk" text
            >{{ $t(`general.save`) }}
          </v-btn>

          <v-btn color="grey" text @click="popupCancel">{{ $t(`general.cancel`) }}</v-btn>
        </template>
      </template>
    </overlay-popup>

    <!-- Mobile delete confirmation bottom sheet  -->
    <v-bottom-sheet
      v-if="$vuetify.breakpoint.smAndDown && editType === 'deleteFeature'"
      v-model="showDeleteDialog"
      inset
    >
      <v-card>
        <v-app-bar :color="color.primary" dark dense flat>
          <v-app-bar-nav-icon>
            <v-icon>delete</v-icon>
          </v-app-bar-nav-icon>
          <v-toolbar-title class="white--text">{{ $t(`general.confirm`) }}</v-toolbar-title>
        </v-app-bar>

        <v-card-text class="body-1 font-weight-medium mt-3 mb-3 pb-0"
          >{{ $t(`form.edit.confirmDeleteFeature`) }}
        </v-card-text>
        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary darken-1" text @click.native="popupOk">{{ $t(`general.yes`) }}</v-btn>
          <v-btn color="grey" @click.native="popupCancel">{{ $t(`general.cancel`) }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-bottom-sheet>
  </div>
</template>
<script>
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Feature from 'ol/Feature';
import RenderFeature from 'ol/render/Feature';
import {LineString, MultiLineString, Polygon, MultiPolygon} from 'ol/geom';
import {Modify, Draw} from 'ol/interaction';
import {unByKey} from 'ol/Observable';
import Overlay from 'ol/Overlay';
import {mapFields} from 'vuex-map-fields';
import {mapGetters, mapMutations} from 'vuex';
import axios from 'axios';
import GeoJSON from 'ol/format/GeoJSON';
import VJsf from '@koumoul/vjsf';
import {getFeatureHighlightStyle} from '../../../../style/OlStyleDefs';
import OverlayPopup from './Overlay.vue';
import {geojsonToFeature} from '../../../../utils/MapUtils';
import {getNestedProperty, parseVideoUrl} from '../../../../utils/Helpers';
import PostMapMarkerLayer from '../../../../utils/PostMapMarker';
import {Mapable} from '../../../../mixins/Mapable';
import '@koumoul/vjsf/lib/VJsf.css';
// load third-party dependencies (markdown-it, vuedraggable)
// you can also load them separately based on your needs
import '@koumoul/vjsf/lib/deps/third-party';
import authHeader from '../../../../services/auth-header';
import {EventBus} from '../../../../EventBus';

import Lightbox from '../../../core/Lightbox.vue';

export default {
  components: {
    'overlay-popup': OverlayPopup,
    'lightbox-dialog': Lightbox,
    'editor-form': VJsf,
  },
  mixins: [Mapable],
  props: {
    map: {type: Object, required: true},
    color: {type: Object},
  },
  data: () => ({
    dialogSelectedLayer: null, // Temporary selection (not active if user doesn't press ok)
    layersDialog: false,
    // INTERACTION
    currentInteraction: null,
    mapClickListener: null,
    pointerMoveKey: null,
    overlayersGarbageCollector: [],
    sketch: null,
    // Help tooltip data
    helpMessage: '',
    helpTooltipElement: null,
    helpTooltip: null,
    helpTooltipMessages: {
      delete: 'form.edit.deleteTooltip',
      select: 'form.edit.selectTooltip',
      edit: 'form.edit.editTooltip',
      modifyAttributes: 'form.edit.modifyAttributesTooltip',
      polygonAndLine: {
        start: 'form.edit.polygonAndLineStartTooltip',
        continue: 'form.edit.polygonAndLineContinueTooltip',
        close: 'form.edit.polygonAndLineCloseTooltip',
      },
      point: {
        start: 'form.edit.pointStartTooltip',
      },
    },
    editSnackbarMessages: {
      modifyAttributes: 'form.edit.modifyAttributesSuccess',
      deleteFeature: 'form.edit.deleteFeatureSuccess',
      addFeature: 'form.edit.addFeatureSuccess',
      modifyFeature: 'form.edit.modifyFeatureSuccess',
    },
    // Popup
    popupOverlay: null,
    popup: {
      title: '',
      isVisible: false,
      el: null,
    },
    // Dynamic form
    formTypesMapping: {
      string: 'string',
      int: 'integer',
      number: 'number',
    },

    postMapMarkerLayer_: null,
    showDeleteDialog: false,

    showAllTranslations: false,
  }),
  name: 'edit-control',
  computed: {
    ...mapFields('map', {
      isEditingLayer: 'isEditingLayer',
      isEditingPost: 'isEditingPost',
      selectedLayer: 'selectedLayer',
      postFeature: 'postFeature',
      postEditType: 'postEditType',
      formValid: 'formValid',
      formSchema: 'formSchema',
      // formSchemaCache: 'formSchemaCache',
      formOptions: 'formOptions',
      formData: 'formData',
      imageUpload: 'imageUpload',
      editType: 'editType',
      mobilePanelState: 'mobilePanelState',
      lightboxDialogState: 'lightboxDialogState',
      editLayer: 'editLayer',
      highlightLayer: 'highlightLayer',
      isTranslating: 'isTranslating',
    }),
    ...mapGetters('map', {
      layersMetadata: 'layersMetadata',
      imageUploadButtonText: 'imageUploadButtonText',
    }),
    ...mapGetters('auth', {
      loggedUser: 'loggedUser',
    }),
    ...mapGetters('app', {
      serverConfig: 'serverConfig',
    }),
    flatLayers() {
      const layers = this.map.getAllLayers();
      return layers;
    },
    isTranslatable() {
      const isTranslationEnabled = this.serverConfig && !!this.serverConfig.isTranslationEnabled;
      if (!isTranslationEnabled) return false;
      const layerName = this.selectedLayer.get('name');
      const layerMetadata = this.layersMetadata[layerName];
      return layerMetadata && layerMetadata.properties.findIndex(property => property.name === 'translations') !== -1;
    },
    editButtons() {
      return [
        {
          icon: 'add',
          action: 'addFeature',
          tooltip: 'addFeature',
          enabled: true,
        },
        {
          icon: 'edit',
          action: 'modifyFeature',
          tooltip: 'modifyGeometry',
          enabled: true,
        },
        {
          icon: 'subject',
          action: 'modifyAttributes',
          tooltip: 'modifyAttributes',
          enabled: true,
        },
        {
          icon: 'delete',
          action: 'deleteFeature',
          tooltip: 'deleteFeature',
          enabled: true,
        },
        {
          icon: 'translate',
          action: 'translateAllFeatures',
          tooltip: 'translateAllFeatures',
          enabled: this.serverConfig && !!this.serverConfig.isTranslationEnabled,
        },
      ];
    },
  },
  methods: {
    onMapBound() {
      this.createLayers();
      this.postMapMarkerLayer_ = new PostMapMarkerLayer();
    },
    createLayers() {
      // -  create an edit vector layer
      const editLayerSource = new VectorSource({
        wrapX: false,
      });
      const options = {
        name: 'edit_layer',
        isInteractive: false,
        queryable: false,
        zIndex: 2000,
        source: editLayerSource,
      };
      const editLayer = new VectorLayer(options);
      this.map.addLayer(editLayer);
      this.editLayer = editLayer;

      // - create highligh layer
      // Create highlight layer
      const highlightSource = new VectorSource({wrapX: false});
      const highlightLayer = new VectorLayer({
        name: 'highlight_layer',
        isInteractive: false,
        queryable: false,
        zIndex: 2001,
        style: getFeatureHighlightStyle(),
        source: highlightSource,
      });
      this.map.addLayer(highlightLayer);
      this.highlightLayer = highlightLayer;
    },
    createPopupOverlay() {
      if (!this.$vuetify.breakpoint.smAndDown) {
        this.popupOverlay = new Overlay({
          element: this.popup.el.$el,
          autoPan: false,
          autoPanMargin: 40,
          autoPanAnimation: {
            duration: 250,
          },
        });
        this.map.addOverlay(this.popupOverlay);
        this.overlayersGarbageCollector.push(this.popupOverlay);
      }
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
    /**
     * Main Edit function
     */
    edit(editType) {
      if (editType === 'translateAllFeatures') {
        const layerName = this.layersMetadata[this.selectedLayer.get('name')].typeName;
        this.isTranslating = true;
        axios
          .get(`./api/translate/${layerName}?sourceLanguage=${this.$appConfig.app.defaultLanguage}`, {
            headers: authHeader(),
          })
          .then(response => {
            this.isTranslating = false;
            this.toggleSnackbar({
              type: 'success',
              message: this.$t('translation.translateAllFeaturesSuccess'),
              timeout: 2000,
              state: true,
            });
          })
          .catch(error => {
            console.log('error', error);
            this.isTranslating = false;
            this.toggleSnackbar({
              type: 'error',
              message: this.$t('translation.translateAllFeaturesError'),
              timeout: 2000,
              state: true,
            });
          });
        return;
      }

      this.removeInteraction();
      this.editType = editType;
      if (!this.selectedLayer) return;
      const layerName = this.selectedLayer.get('name');
      const layerMetadata = this.layersMetadata[layerName];
      this.createSchemaFromLayerMetadata(); // Used for dynamic form rendering
      let geometryType;
      if (layerMetadata) {
        const geometryFields = layerMetadata.properties.filter(p => ['geom', 'geometry'].includes(p.name));
        // eslint-disable-next-line no-unused-expressions
        Array.isArray(geometryFields) && geometryFields.length > 0
          ? (geometryType = geometryFields[0].localType)
          : null;
      }
      if (!geometryType) return;
      if (!this.$vuetify.breakpoint.smAndDown) {
        this.createHelpTooltip();
        this.pointerMoveKey = this.map.on('pointermove', this.onPointerMove);
        this.createPopupOverlay();
      }
      this.isEditingLayer = true;
      switch (editType) {
        case 'addFeature': {
          this.currentInteraction = new Draw({
            source: this.editLayer.getSource(),
            type: geometryType,
            geometryName: 'geom',
          });
          this.currentInteraction.on('drawstart', this.onDrawStart);
          this.currentInteraction.on('drawend', this.onDrawEnd);
          break;
        }
        case 'modifyFeature': {
          this.currentInteraction = new Modify({
            source: this.editLayer.getSource(),
          });
          this.mapClickListener = this.map.on('click', this.selectFeature);
          this.currentInteraction.on('modifystart', this.onModifyStart);
          this.currentInteraction.on('modifyend', this.onModifyEnd);
          break;
        }
        case 'deleteFeature': {
          this.mapClickListener = this.map.on('click', this.selectFeature);
          break;
        }
        case 'modifyAttributes': {
          this.mapClickListener = this.map.on('click', this.selectFeature);
          break;
        }
        default:
          break;
      }
      this.startResetHelpTooltip();
      if (this.currentInteraction) {
        this.map.addInteraction(this.currentInteraction);
      }
      this.mobilePanelState = false;
    },
    /**
     * Transforms layer metadata into a json structure which can be used to render dynamic vuetify components
     */
    createSchemaFromLayerMetadata() {
      const formSchema = {
        type: 'object',
        required: [],
        properties: {},
      };
      const layerName = this.selectedLayer.get('name');
      // if (!this.formSchemaCache[layerName]) {
      const layerMetadata = this.layersMetadata[layerName];
      if (layerMetadata) {
        layerMetadata.properties.forEach(property => {
          const type = this.formTypesMapping[property.localType];
          if (type) {
            let title;
            const fieldMapping = this.$appConfig.map.popupFieldsMapping;
            if (fieldMapping) {
              title =
                getNestedProperty(fieldMapping, `${layerName}.${property.name}`) ||
                fieldMapping.default[property.name] ||
                property.name;
            }
            title = title.toUpperCase();
            formSchema.properties[property.name] = {
              type,
              title,
            };
            if (property.nillable === false) {
              formSchema.required.push(property.name);
            }
            if (property.name === 'geom') {
              formSchema[property.name]['x-display'] = 'hidden';
            }
            if (property.name === 'lightbox') {
              formSchema.properties[property.name].readOnly = true;
            }
            if (property.name === 'translations') {
              formSchema.properties[property.name]['x-display'] = 'hidden';
            }
          }
        });
        // this.formSchemaCache[layerName] = this.formSchema;
      }
      // } else {
      // this.formSchema = this.formSchemaCache[layerName];
      // }
      this.formSchema = formSchema;
    },

    createSchemaWithTranslations() {
      const formSchema = {
        type: 'object',
        required: [],
        properties: {},
      };
      const layerName = this.selectedLayer.get('name');
      const layerMetadata = this.layersMetadata[layerName];

      if (layerMetadata) {
        // parse translations field

        const translations = this.formData.translations;

        layerMetadata.properties.forEach(property => {
          const type = this.formTypesMapping[property.localType];
          if (type) {
            let title;
            const fieldMapping = this.$appConfig.map.popupFieldsMapping;
            if (fieldMapping) {
              title =
                getNestedProperty(fieldMapping, `${layerName}.${property.name}`) ||
                fieldMapping.default[property.name] ||
                property.name;
            }
            formSchema.properties[property.name] = {
              type,
              title: title.toUpperCase(),
            };

            // populate translated fields
            if (this.$appConfig.map.featureInfoHiddenProps.indexOf(property.name) === -1) {
              this.$i18n.availableLocales
                .filter(l => l !== this.$appConfig.app.defaultLanguage)
                .forEach(language => {
                  formSchema.properties[`${language}:${property.name}`] = {
                    type,
                    title: `${language}:${property.name.toUpperCase()}`,
                  };
                  if (translations && translations[language]) {
                    this.formData[`${language}:${property.name}`] = translations[language][property.name];
                  } else {
                    this.formData[`${language}:${property.name}`] = '';
                  }
                });
            }

            if (property.nillable === false) {
              formSchema.required.push(property.name);
            }
            if (property.name === 'geom') {
              formSchema[property.name]['x-display'] = 'hidden';
            }
            if (property.name === 'lightbox') {
              formSchema.properties[property.name].readOnly = true;
            }
            if (property.name === 'translations') {
              formSchema.properties[property.name]['x-display'] = 'hidden';
            }
          }
        });
      }

      this.formSchema = formSchema;
    },

    /**
     * Draw event
     */
    onDrawStart(evt) {
      this.sketch = evt.feature;
    },
    onDrawEnd(evt) {
      const feature = evt.feature;
      this.selectedFeature = feature;
      this.popupCancel();
      if (this.currentInteraction) {
        this.currentInteraction.setActive(false);
      }
      this.highlightLayer.getSource().addFeature(feature.clone());
      let popupCoordinate = feature.getGeometry().getCoordinates();
      while (popupCoordinate && Array.isArray(popupCoordinate[0])) {
        popupCoordinate = popupCoordinate[0];
      }
      const mapSize = this.map.getSize();
      const extent = this.map.getView().calculateExtent([mapSize[0], mapSize[1] - 300]);
      const height = Math.abs(extent[3] - extent[1]);
      const centerPoint = [popupCoordinate[0], popupCoordinate[1] + height / 2];
      this.map.getView().animate({
        center: centerPoint,
        duration: 400,
      });
      if (this.popupOverlay) {
        this.popupOverlay.setPosition(popupCoordinate);
        this.popup.title = 'Attributes';
        this.popup.isVisible = true;
      }
      this.sketch = null;
      this.startResetHelpTooltip();
      if (this.$vuetify.breakpoint.smAndDown) {
        this.mobilePanelState = true;
        this.map.getView().setCenter(popupCoordinate);
      }
    },

    /**
     * Modify event
     */
    onModifyStart() {
      this.selectedFeature = null;
    },
    onModifyEnd(evt) {
      this.selectedFeature = evt.features.getArray()[0];
      this.transact();
    },

    /**
     * Select feature
     */
    async selectFeature(evt) {
      // Get feature attributes popup
      this.highlightLayer.getSource().clear();
      this.mobilePanelState = false;
      const selectedLayer = this.selectedLayer;
      if (['VECTOR', 'VECTORTILE'].includes(this.selectedLayer.get('type'))) {
        const features = this.map.getFeaturesAtPixel(evt.pixel, {
          layerFilter: layerCandidate => layerCandidate.get('name') === selectedLayer.get('name'),
          hitTolerance: 3,
        });
        if (features.length > 0) {
          let feature = features[0];
          // Workaround for vector tile layers.
          if (feature instanceof RenderFeature) {
            const urls = selectedLayer.getSource().getUrls()[0];
            const url = urls.match('tms/1.0.0/(.*)@EPSG');
            if (!urls.includes('geoserver')) return;
            if (!Array.isArray(url) || url.length < 2) return;
            const geoserverLayerName = url[1];
            const response = await axios.get('./geoserver/wfs', {
              params: {
                service: 'WFS',
                version: ' 2.0.0',
                request: 'GetFeature',
                outputFormat: 'application/json',
                srsName: 'EPSG:3857',
                typeNames: geoserverLayerName,
                featureId: feature.getId(),
              },
            });
            if (response.data.features) {
              const olFeatures = geojsonToFeature(response.data, {});
              feature = olFeatures[0];
            }
          }
          if (feature) {
            this.selectedFeature = feature;

            if (['deleteFeature', 'modifyAttributes'].includes(this.editType)) {
              this.highlightLayer.getSource().addFeature(feature.clone());
              const popupCoordinate = feature.getGeometry().getCoordinates();
              let closestPoint;
              if (popupCoordinate) {
                closestPoint = feature.getGeometry().getClosestPoint(evt.coordinate);
              } else {
                closestPoint = evt.coordinate;
              }
              const mapSize = this.map.getSize();
              const extent = this.map.getView().calculateExtent([mapSize[0], mapSize[1] - 300]);
              const height = Math.abs(extent[3] - extent[1]);
              const centerPoint = [closestPoint[0], closestPoint[1] + height / 2];
              this.map.getView().animate({
                center: centerPoint,
                duration: 400,
              });
              if (this.popupOverlay) {
                this.popupOverlay.setPosition(closestPoint);
                this.popup.isVisible = true;
              }

              if (this.editType === 'deleteFeature') {
                this.popup.title = 'Confirm';
                setTimeout(() => {
                  this.$nextTick(() => {
                    this.showDeleteDialog = true;
                  });
                }, 100);
              } else if (this.editType === 'modifyAttributes') {
                this.popup.title = 'Modify Attributes';

                const properties = feature.getProperties();

                if (properties.translations) {
                  properties.translations = JSON.parse(properties.translations);
                  this.formData = {
                    ...properties,
                    ...(properties.translations[this.$appConfig.app.defaultLanguage]
                      ? properties.translations[this.$appConfig.app.defaultLanguage]
                      : {}),
                  };
                } else {
                  this.formData = properties;
                  this.formData.translations = {};
                }

                if (this.$vuetify.breakpoint.smAndDown) {
                  this.mobilePanelState = true;
                  // this.map.getView().setCenter(closestPoint);
                }
              }
            } else if (this.editType === 'modifyFeature') {
              this.editLayer.getSource().clear();
              this.editLayer.getSource().addFeature(this.selectedFeature);
              this.helpMessage = this.$t(this.helpTooltipMessages.edit);
            }
          }
        }
      }
    },

    /**
     * Upload Image
     */
    openImageUpload() {
      this.imageUpload.isSelecting = false;
      if (this.$vuetify.breakpoint.smAndDown) {
        EventBus.$emit('open-image-upload');
      } else {
        this.$refs.imageUploader.click();
      }
    },
    onFileUploadChanged(e) {
      this.imageUpload.selectedFile = e.target.files[0];
      // do something
      const fileSize = this.imageUpload.selectedFile.size / 1024 / 1024;
      if (fileSize > 5) {
        this.imageUpload.errorMessage = 'File size exceeds 5 MB';
        setTimeout(() => {
          if (this.$vuetify.breakpoint.smAndDown) {
            EventBus.$emit('clearUploadImage');
          } else {
            this.clearUploadImage();
          }
        }, 2000);
      }
    },
    clearUploadImage() {
      this.imageUpload.selectedFile = null;
      this.$refs.imageUploader.value = null;
      this.imageUpload.errorMessage = '';
      this.imageUpload.position = 'sidebarMediaTop';
    },
    /**
     * Popup action buttons
     */
    popupOk() {
      if (this.editType === 'deleteFeature') {
        // TODO: Commit delete in the server
        // Remove feature from the source
        if (this.selectedFeature) {
          this.selectedLayer.getSource().removeFeature(this.selectedFeature);
        }
      } else if (['addFeature', 'modifyAttributes'].includes(this.editType) && this.selectedFeature) {
        // Get properties and assign it to feature
        const properties = Object.keys(this.formSchema.properties);
        properties.forEach(property => {
          if (!this.formData[property]) {
            this.formData[property] = this.formSchema.properties[property].type === 'string' ? '' : null;
          }
        });
        this.selectedFeature.setProperties(this.formData);
      }
      // Commit change in db
      this.transact();

      // Close popup and clear previous interactions.
      this.popupCancel();
      this.showDeleteDialog = false;
    },
    popupCancel() {
      if (this.popupOverlay) {
        this.popupOverlay.setPosition(undefined);
        this.popup.isVisible = false;
      }
      if (this.currentInteraction) {
        this.currentInteraction.setActive(true);
      }
      this.highlightLayer.getSource().clear();
      this.editLayer.getSource().clear();
      if (this.$vuetify.breakpoint.smAndDown) {
        EventBus.$emit('clearUploadImage');
      } else {
        this.clearUploadImage();
      }
      this.mobilePanelState = false;
      this.showDeleteDialog = false;
      this.showAllTranslations = false;
    },

    /**
     * Pointermove for tooltip
     */
    onPointerMove(evt) {
      // Hide helptooltip if mouse is over popoverlay
      if (this.popupOverlay && this.popupOverlay.getPosition() !== undefined) {
        this.helpTooltip.setPosition(undefined);
        return;
      }

      const coordinate = evt.coordinate;
      if (this.sketch) {
        const geom = this.sketch.getGeometry();
        if (
          geom instanceof Polygon ||
          geom instanceof MultiPolygon ||
          geom instanceof LineString ||
          geom instanceof MultiLineString
        ) {
          this.helpMessage = this.$t(this.helpTooltipMessages.polygonAndLine.continue);
          if (geom.getCoordinates && geom.getCoordinates().length > 2) {
            this.helpMessage = this.$t(this.helpTooltipMessages.polygonAndLine.close);
          }
        }
      }
      this.helpTooltipElement.innerHTML = this.helpMessage;
      this.helpTooltip.setPosition(coordinate);
      this.map.getTarget().style.cursor = 'pointer';
    },

    /**
     * UI BUTTON EVENTS
     */
    activateEdit() {
      this.layersDialog = true;
      if (this.isEditingPost) {
        this.isEditingPost = false;
      }
    },
    togglePostEdit() {
      this.isEditingPost = !this.isEditingPost;
      if (this.isEditingLayer) {
        this.closeEdit();
      }
    },
    changeLayer() {
      this.layersDialog = true;
    },

    /**
     * CLOSE/CLEAR METHODS
     */
    closeEdit() {
      this.selectedLayer = null;
      this.dialogSelectedLayer = null;
      this.layersDialog = false;
      this.removeInteraction();
    },
    startResetHelpTooltip() {
      let geometryType;
      const layerMetadata = this.layersMetadata[this.selectedLayer.get('name')];
      if (layerMetadata) {
        geometryType = layerMetadata.properties[0].localType;
      } else {
        return;
      }
      if (this.editType === 'addFeature') {
        this.helpMessage = ['Point'].some(r => geometryType.includes(r))
          ? this.$t(this.helpTooltipMessages.point.start)
          : this.$t(this.helpTooltipMessages.polygonAndLine.start);
      }
      if (this.editType === 'modifyFeature') {
        this.helpMessage = this.$t(this.helpTooltipMessages.select);
      }
      if (this.editType === 'modifyAttributes') {
        this.helpMessage = this.$t(this.helpTooltipMessages.modifyAttributes);
      }
      if (this.editType === 'deleteFeature') {
        this.helpMessage = this.$t(this.helpTooltipMessages.delete);
      }
    },

    removeInteraction() {
      this.editLayer.getSource().clear();
      this.highlightLayer.getSource().clear();
      this.selectedFeature = null;
      this.isEditingLayer = false;
      this.editType = null;
      this.formData = {};
      this.clearOverlays();
      this.showDeleteDialog = false;
      if (this.currentInteraction) {
        this.map.removeInteraction(this.currentInteraction);
        this.currentInteraction = null;
      }
      if (this.mapClickListener) {
        unByKey(this.mapClickListener);
      }
      if (this.pointerMoveKey) {
        unByKey(this.pointerMoveKey);
      }
    },

    /**
     * TRANSACT METHOD
     */
    transact() {
      if (!this.selectedFeature) {
        return;
      }

      let {
        // eslint-disable-next-line no-unused-vars
        geometry,
        // eslint-disable-next-line no-unused-vars
        geom,
        // eslint-disable-next-line no-unused-vars
        keys,
        ...propsWithNoGeometry
      } = this.selectedFeature.getProperties();

      // update translations if they have been edited manually
      const propsWithTranslations = Object.fromEntries(
        Object.entries(propsWithNoGeometry).filter(([key]) => key.includes(':'))
      );

      // eslint-disable-next-line guard-for-in
      for (const propName in propsWithTranslations) {
        const [lang, propVakue] = propName.split(':');
        propsWithNoGeometry.translations[lang][propVakue] = propsWithTranslations[propName];
      }

      // filter out properties that have semicolon, that is, are temporary translations
      propsWithNoGeometry = Object.fromEntries(
        Object.entries(propsWithNoGeometry).filter(([key]) => !key.includes(':'))
      );

      if (propsWithNoGeometry?.translations?.length === 0) {
        propsWithNoGeometry.translations = {};
      }

      // Transform Video Url if exists
      const videoPossibilities = ['youtube-nocookie.com', 'youtube.com', 'vimeo.com'];

      // For overlay video player
      if (propsWithNoGeometry.vimeoSrc) {
        propsWithNoGeometry.vimeoSrc = parseVideoUrl(propsWithNoGeometry.vimeoSrc);
      }
      if (propsWithNoGeometry.videoSrc) {
        propsWithNoGeometry.videoSrc = parseVideoUrl(propsWithNoGeometry.videoSrc);
      }

      // For sidebar video player
      if (
        propsWithNoGeometry.sidebarMediaTop &&
        videoPossibilities.some(v => propsWithNoGeometry.sidebarMediaTop.includes(v))
      ) {
        propsWithNoGeometry.sidebarMediaTop = parseVideoUrl(propsWithNoGeometry.sidebarMediaTop);
      }

      if (
        propsWithNoGeometry.sidebarMediaBottom &&
        videoPossibilities.some(v => propsWithNoGeometry.sidebarMediaBottom.includes(v))
      ) {
        propsWithNoGeometry.sidebarMediaBottom = parseVideoUrl(propsWithNoGeometry.sidebarMediaBottom);
      }

      const feature = new Feature({
        geom: this.selectedFeature.getGeometry().clone(),
        ...propsWithNoGeometry,
      });
      feature.setGeometryName('geom');
      feature.getGeometry().transform('EPSG:3857', 'EPSG:4326');
      feature.setId(this.selectedFeature.getId());
      const type = {
        addFeature: 'insert',
        modifyAttributes: 'update',
        modifyFeature: 'update',
        deleteFeature: 'delete',
      };
      const payload = {
        type: type[this.editType],
        srid: '4326',
        table: this.layersMetadata[this.selectedLayer.get('name')].typeName,
        geometry: new GeoJSON().writeGeometryObject(feature.getGeometry()),
        properties: propsWithNoGeometry,
        featureId: feature.getId(),
      };

      const formData = new FormData();
      if (this.imageUpload.selectedFile) {
        formData.append('image', this.imageUpload.selectedFile);
        // eslint-disable-next-line
        if (payload.properties.hasOwnProperty(this.imageUpload.position)) {
          payload.sidebarPosition = this.imageUpload.position;
        }
      }

      formData.append('payload', JSON.stringify(payload));
      axios
        .post('api/layer', formData, {
          headers: authHeader(),
        })
        .then(() => {
          this.showAllTranslations = false;
          if (this.editType !== 'modifyFeature') {
            this.editLayer.getSource().clear();
          }
          this.formData = {};
          if (this.selectedLayer && this.selectedLayer.getSource().refresh) {
            if (this.selectedLayer.get('type') === 'VECTOR') {
              this.selectedLayer.getSource().refresh();
            } else if (this.selectedLayer.get('type') === 'VECTORTILE') {
              // this.selectedLayer.getSource().tileCache.expireCache({});
              // this.selectedLayer.getSource().clear();
              // this.selectedLayer.getSource().tileCache.clear();
              this.selectedLayer.getSource().clear();
              this.selectedLayer.getSource().refresh({force: true});
              this.selectedLayer.redraw?.();
            }
            this.toggleSnackbar({
              type: 'success',
              message: this.editSnackbarMessages[this.editType],
              timeout: 2000,
              state: true,
            });
          }
        });
    },

    translateAttributes() {
      const layerName = this.selectedLayer.get('name');
      const layerMetadata = this.layersMetadata[layerName];
      const translations = this.formData.translations ? this.formData.translations : {};

      const promises = [];
      const promisesParams = [];
      this.$i18n.availableLocales
        .filter(l => l !== this.$appConfig.app.defaultLanguage)
        .forEach(language => {
          const propertyFields = [];
          const propertyValues = [];
          layerMetadata.properties.forEach(property => {
            if (
              this.$appConfig.map.featureInfoHiddenProps.indexOf(property.name) === -1 &&
              this.formData[property.name] &&
              translations &&
              (!translations[language] || // a form is translated for the first time
                !translations[language][property.name] || // a previously empty field has been filled in and needs to be translated
                (translations[language][property.name] &&
                  this.showAllTranslations &&
                  !this.formData[`${language}:${property.name}`])) // an existing translation needs to be re-translated
            ) {
              propertyFields.push(property.name);
              propertyValues.push(this.formData[property.name].toString());
            }
          });

          if (propertyFields.length > 0) {
            promisesParams.push({language, propertyFields, propertyValues});
            promises.push(
              axios.post(
                './api/translate',
                {content: propertyValues, targetLanguage: language},
                {
                  headers: authHeader(),
                }
              )
            );
          }
        });

      if (promises.length > 0) {
        // show progress spinner
        this.isTranslating = true;

        Promise.all(promises)
          .then(results => {
            // hide progress spinner
            this.isTranslating = false;

            // show success message
            this.toggleSnackbar({
              type: 'success',
              message: this.$t('translation.translateAllFeaturesSuccess'),
              timeout: 2000,
              state: true,
            });

            for (let i = 0; i < results.length; i += 1) {
              if (!translations[promisesParams[i].language]) {
                // if a form is translated for the first time
                translations[promisesParams[i].language] = {};
              }
              for (let j = 0; j < promisesParams[i].propertyFields.length; j += 1) {
                translations[promisesParams[i].language][promisesParams[i].propertyFields[j]] = results[i].data[j];
                // populate a form field with translation
                this.formData[`${promisesParams[i].language}:${promisesParams[i].propertyFields[j]}`] =
                  results[i].data[j];
              }
            }

            // populate translations field with updated translations
            this.formData.translations = translations;
          })
          .catch(error => {
            console.log('error', error);
            // hide progress spinner
            this.isTranslating = false;

            // show error message
            this.toggleSnackbar({
              type: 'error',
              message: this.$t('translation.translateAllFeaturesError'),
              timeout: 2000,
              state: true,
            });
          });
      }
    },

    ...mapMutations('map', {
      toggleSnackbar: 'TOGGLE_SNACKBAR',
    }),
  },
  mounted() {
    /**
     * Reference popup element
     */
    this.popup.el = this.$refs.popup;
    /**
     * Create event listener for escape key
     */
    document.onkeyup = null;
    document.onkeyup = evt => {
      const key = evt.key;
      const code = evt.keyCode;
      if (key === 'Escape' || code === '27') {
        if (this.removeInteraction) {
          this.removeInteraction();
        }
      }
    };

    // Mobile close cb
    EventBus.$on('closeAll', () => {
      if (this.isEditingPost) {
        // Closes post editor
        this.togglePostEdit();
      }
      if (this.selectedLayer) {
        this.removeInteraction();
      }
    });
    EventBus.$on('popupOk', this.popupOk);
    EventBus.$on('popupCancel', this.popupCancel);
    EventBus.$on('openImageUpload', this.openImageUpload);
    EventBus.$on('onFileUploadChanged', this.onFileUploadChanged);
  },
  beforeDestroy() {
    this.closeEdit();
  },
  watch: {
    $route(newValue, oldValue) {
      if (oldValue.path === newValue.path) {
        return;
      }
      this.closeEdit();
    },
    selectedLayer(layer) {
      if (layer && this.$vuetify.breakpoint.smAndDown) {
        this.mobilePanelState = false;
      }
    },
    postFeature(newValue) {
      if (newValue) {
        this.map.removeLayer(this.postMapMarkerLayer_);
        this.postMapMarkerLayer_.setFlashlightVisible(false);
      }
    },
    isEditingPost(state) {
      if (state === true && this.postEditType !== 'update') {
        setTimeout(() => {
          this.map.addLayer(this.postMapMarkerLayer_);
          this.$nextTick(() => {
            this.postMapMarkerLayer_.setFlashlightVisible(true);
            this.map.once('moveend', () => {
              this.postMapMarkerLayer_.setFlashlightVisible(false);
            });
          });
        }, 20);
      } else {
        this.map.removeLayer(this.postMapMarkerLayer_);
        this.postMapMarkerLayer_.setFlashlightVisible(false);
      }
    },
    showAllTranslations(newValue) {
      if (newValue) {
        this.createSchemaWithTranslations();
      } else {
        this.createSchemaFromLayerMetadata();
      }
    },
  },
};
</script>
<style lang="css" scoped>
.edit-buttons {
  z-index: 1;
}
</style>
