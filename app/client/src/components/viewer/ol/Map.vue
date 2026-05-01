<template>
  <div id="ol-map-container" @click="$event => resetAfterSlide()">
    <!-- Slideshow video overlay -->
    <div v-if="slideshow.videoSrc" class="slideshow-video-overlay" @mousemove="resetAfterSlide()">
      <video
        v-if="slideshow.videoIsDirect"
        :key="slideshow.videoSrc"
        :src="slideshow.videoSrc"
        autoplay
        :muted.prop="true"
        playsinline
        class="slideshow-video-direct"
        @error="onVideoError"
      ></video>
      <iframe
        v-else
        :src="slideshow.videoSrc"
        frameborder="0"
        allow="autoplay; encrypted-media; fullscreen"
        allowfullscreen
      ></iframe>
    </div>
    <!-- Instructional panel overlay — shown on top of any slide type, pointer-events off so cursor events reach the layer below -->
    <div v-if="slideshow.overlayUrl" class="slideshow-panel-overlay">
      <img :src="slideshow.overlayUrl" class="slideshow-panel-img" />
    </div>
    <!-- Slideshow photo overlay -->
    <div v-if="slideshow.photoSlide" class="slideshow-photo-overlay" @mousemove="resetAfterSlide()">
      <div class="slideshow-photo-content">
        <img :src="slideshow.photoSlide.url" :alt="slideshow.photoSlide.caption" />
        <p v-if="slideshow.photoSlide.caption" class="slideshow-photo-caption">
          {{ slideshow.photoSlide.caption }}
        </p>
      </div>
    </div>
    <!-- Slideshow toggle button — visible whenever slideshow is configured -->
    <v-tooltip
      v-if="
        $appConfig.map.flyToSlideshow &&
        $appConfig.map.flyToSlideshow.maplinks &&
        $appConfig.map.flyToSlideshow.maplinks.length > 0
      "
      left
    >
      <template v-slot:activator="{on, attrs}">
        <div class="slideshow-toggle-btn" v-bind="attrs" v-on="on" @click.stop="toggleSlideshow()">
          <span v-if="!slideshow.userStopped" class="slideshow-toggle-dot"></span>
        </div>
      </template>
      <span>{{ slideshow.userStopped ? $t('general.slideshowRestart') : $t('general.slideshowStop') }}</span>
    </v-tooltip>

    <!-- Map Controls -->
    <map-legend :color="color.primary" />
    <time-slider :color="color.primary" />
    <div style="position: absolute; left: 20px; top: 10px">
      <login-button :color="color.primary"></login-button>
      <search-map
        v-if="$appConfig.app.controls && $appConfig.app.controls.geocoder"
        :color="color.primary"
        :map="map"
      ></search-map>
      <zoom-control :color="color.primary" :map="map" />
      <full-screen :color="color.primary" />
      <share-map
        v-if="$appConfig.app.controls && $appConfig.app.controls.share_map"
        :color="color.primary"
        :map="map"
      ></share-map>
      <!-- Show only on mobile -->
      <locate v-if="$appConfig.app.controls && $appConfig.app.controls.locate_me" :color="color.primary" :map="map" />
    </div>
    <div style="position: absolute; left: 50%; bottom: 10px; z-index: 10">
      <route-controls
        v-show="!isEditingPost"
        v-if="!$vuetify.breakpoint.smAndDown"
        :color="{
          activeButton: color.secondary,
          inactiveButton: color.primary,
        }"
      />
    </div>

    <!-- Edit & Analysis Controls -->
    <div style="position: absolute; right: 20px; top: 10px">
      <!-- Edit Controls (Only available for logged users which aren't guests ) -->
      <div v-if="loggedUser">
        <edit :map="map" :color="{primary: color.primary, activeButton: color.secondary}" />
      </div>
      <!-- Analysis Control (Always visible unless editing) -->
      <div
        v-if="!selectedLayer && !isEditingPost && $appConfig.app.analysis && $appConfig.app.analysis.rShinyServerUrl"
      >
        <analysis :map="map" :color="color.primary" />
      </div>
    </div>
    <div
      v-if="$vuetify.breakpoint.smAndDown"
      :style="`position:absolute;bottom:${
        $vuetify.breakpoint.smAndDown && !mobilePanelState ? 70 : 20
      }px;left:50%;z-index:100;transform:translateX(-50%);`"
    >
      <edit-guide :color="color.primary" :map="map"></edit-guide>
    </div>
    <div
      :style="`position:absolute;bottom:${
        $vuetify.breakpoint.smAndDown && !mobilePanelState ? 70 : 20
      }px;left:50%;z-index:101;transform:translateX(-50%);`"
    >
      <add-post :color="color.primary" :map="map"></add-post>
    </div>
    <div
      v-show="spotlightMessage === true && !$vuetify.breakpoint.smAndDown && !isEditingPost"
      :style="`background-color: ${color.primary}`"
      class="elevation-4 regular spotlight-message"
      ref="spotlightControls"
    >
      {{ $t('tooltip.changeSpotlight') }}
    </div>

    <!-- Popup overlay  -->
    <overlay-popup
      :title="
        popup.activeFeature
          ? popup.activeFeature.get('category') || popup.activeFeature.get('title')
            ? popup.activeFeature.get('category') || popup.activeFeature.get('title')
            : popup.activeLayer
            ? popup.activeLayer.get('name')
            : ''
          : ''
      "
      v-show="popup.isVisible"
      ref="popup"
    >
      <v-btn icon>
        <v-icon>close</v-icon>
      </v-btn>
      <template v-slot:close>
        <v-btn @click="closePopup()" icon>
          <v-icon>close</v-icon>
        </v-btn>
      </template>
      <template v-slot:body>
        <vue-scroll ref="vs">
          <div style="max-height: 280px" class="pr-2">
            <div class="body-2" v-for="item in popupInfo" :key="item.property">
              <span
                v-if="isPopupRowVisible(item)"
                v-html="`<strong>${mapPopupPropName(item, popup.activeLayer)}: </strong>` + item.value"
              ></span>
            </div>
          </div>
        </vue-scroll>
        <div v-if="popup.activeFeature" class="mt-1">
          <a
            v-if="
              popup.activeLayer &&
              popup.activeLayer.get('showZoomToFeature') !== false &&
              popup.activeFeature &&
              selectedCoorpNetworkEntity === null
            "
            href="javascript:void(0)"
            @click="zoomToFeature()"
          >
            <strong>{{
              popup.activeFeature.getGeometry().getType() === 'Point' ? 'DIVE' : 'VIEW WHOLE FEATURE'
            }}</strong>
          </a>
          <a
            v-show="popup.activeLayer.get('includeInSearch') !== false"
            v-if="
              (popup.activeFeature.get('entity') && !selectedCoorpNetworkEntity) ||
              (selectedCoorpNetworkEntity &&
                popup.activeFeature.get('entity') &&
                splittedEntities &&
                !splittedEntities.some(substring => popup.activeFeature.get('entity').includes(substring)))
            "
            @click="queryCorporateNetwork"
            href="javascript:void(0)"
            class="ml-2"
          >
            <strong>{{ searchLabel }}</strong>
          </a>
        </div>
      </template>
    </overlay-popup>

    <!-- Lightbox overlay -->
    <app-lightbox ref="lightbox" :images="lightBoxImages"></app-lightbox>
    <!-- Progress loader -->
    <progress-loader
      :value="progressLoading.value"
      :progressColor="progressLoading.progressColor"
      :message="progressLoading.message"
    ></progress-loader>
    <progress-loader
      :value="isTranslating"
      :progressColor="progressLoading.progressColor"
      :message="$t('translation.translateLoadingText')"
    ></progress-loader>
    <!-- Show snackbar -->
    <snackbar style="margin-top: 60px"></snackbar>
  </div>
</template>

<script>
import Vue from 'vue';

// ol imports
import Map from 'ol/Map';
import View from 'ol/View';
import Overlay from 'ol/Overlay';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import Feature from 'ol/Feature';
import RenderFeature from 'ol/render/Feature';
import {fromExtent} from 'ol/geom/Polygon';
import {fromLonLat} from 'ol/proj';
import {extend, createEmpty} from 'ol/extent';
import {like as likeFilter, or as orFilter} from 'ol/format/filter';

// style imports
import {mapMutations, mapGetters, mapActions} from 'vuex';
import {mapFields} from 'vuex-map-fields';
import DoubleClickZoom from 'ol/interaction/DoubleClickZoom';
import {defaults as defaultInteractions} from 'ol/interaction';
import {defaults as defaultControls, Attribution} from 'ol/control';
import axios from 'axios';
import {popupInfoStyle, networkCorpHighlightStyle, worldOverlayFill} from '../../../style/OlStyleDefs';

// import the app-wide EventBus
import {EventBus} from '../../../EventBus';

// Persists across route-triggered remounts so slideshow always resets to the original startup route
let _slideshowHomeHash = null;
let _slideshowPendingOverlay = undefined; // carries overlay URL across map-slide remounts
let _slideshowHasNavigated = false; // carries hasNavigated flag across map-slide remounts

// utils imports
import {LayerFactory} from '../../../factory/OlLayer';
import {isCssColor, debounce, Timer} from '../../../utils/Helpers';
import {extractGeoserverLayerNames, wfsRequestParser, getLayerSourceUrl} from '../../../utils/Layer';
import UrlUtil from '../../../utils/Url';
import {geojsonToFeature} from '../../../utils/MapUtils';

// Store imports

// Map Controls
import OverlayPopup from './controls/Overlay.vue';
import ZoomControl from './controls/ZoomControl.vue';
import FullScreen from './controls/FullScreen.vue';
import Locate from './controls/Locate.vue';
import Search from './controls/Search.vue';
import RouteControls from './controls/RouteControls.vue';
import Legend from './controls/Legend.vue';
import TimeSlider from './controls/TimeSlider.vue';
import Login from './controls/Login.vue';
import Edit from './controls/Edit.vue';
import ShareMap from './controls/ShareMap.vue';
import AddPost from './controls/AddPost.vue';
import EditGuide from './controls/EditGuide.vue';
import Analysis from './controls/Analysis.vue';
// Interactions

// Ol controls

// Lightbox
import AppLightBox from '../../core/AppLightBox.vue';

// Media lightbox
import MediaLightBox from '../../core/MediaLightBox';

// Shared methods
import {SharedMethods} from '../../../mixins/SharedMethods';

// Services
import http from '../../../services/http';

// Progress loader
import ProgressLoader from '../../core/ProgressLoader.vue';
import Snackbar from '../../core/Snackbar.vue';

export default {
  components: {
    'add-post': AddPost,
    'overlay-popup': OverlayPopup,
    'map-legend': Legend,
    'time-slider': TimeSlider,
    'login-button': Login,
    'zoom-control': ZoomControl,
    'full-screen': FullScreen,
    'route-controls': RouteControls,
    'app-lightbox': AppLightBox,
    'share-map': ShareMap,
    'search-map': Search,
    locate: Locate,
    'progress-loader': ProgressLoader,
    edit: Edit,
    'edit-guide': EditGuide, // mobile bottom info alerts
    analysis: Analysis,
    Snackbar,
  },
  name: 'app-ol-map',
  data() {
    return {
      zoom: this.$appConfig.map.zoom,
      center: this.$appConfig.map.center,
      minResolution: this.$appConfig.map.minResolution,
      maxResolution: this.$appConfig.map.maxResolution,
      minZoom: this.$appConfig.map.minZoom,
      maxZoom: this.$appConfig.map.maxZoom,
      extent: this.$appConfig.map.extent,
      color: this.$appConfig.app.color,
      allLayers: [],
      queryableLayers: [],
      queryLayersGeoserverNames: null,
      activeInteractions: [],
      getInfoResult: [],
      radius: 140,
      mousePosition: undefined,
      spotlightMessage: this.$appConfig?.spotlightMessage?.isVisible || false,
      lightBoxImages: [],
      progressLoading: {
        message: 'Fetching Corporate Network',
        progressColor: this.$appConfig.app.color.primary,
        value: false,
      },
      ops: {
        vuescroll: {
          sizeStrategy: 'number',
        },
      },
      noMapReset: false,
      layerVisibilityState: {},
      slideshow: {
        currentIndex: 0, // Index of current coordinate.
        isFlying: false, // Use to check if pointdrap or movend is triggered from the flyToFn
        timer: null, // timer between frames
        timeout: null, // timer for initial start.
        videoSrc: null, // non-null while a video slide is displayed
        videoIsDirect: false, // true when videoSrc is a direct file URL (mp4/webm) vs an embed
        photoSlide: null, // non-null while a photo slide is displayed: { url, caption }
        videoTimeout: null, // timeout handle for video/photo auto-advance
        isRunning: false,
        hasNavigated: false,
        homeHash: null,
        overlayUrl: null, // non-null while an instructional panel image is shown
        userStopped: false, // true when user explicitly stopped the slideshow via the button
      },
    };
  },
  mixins: [SharedMethods],
  mounted() {
    const me = this;
    // Add keydown event listener to change spotlight radius
    window.addEventListener('keydown', e => {
      if (e.keyCode === 38) {
        // up arrow key
        this.radius = Math.min(this.radius + 5, 800);
        this.map.render();
      } else if (e.keyCode === 40) {
        // down arrow key
        this.radius = Math.max(this.radius - 5, 0);
        this.map.render();
      }
    });
    // Make the OL map accessible for Mapable mixin even 'ol-map-mounted' has
    // already been fired. Don not use directly in cmps, use Mapable instead.
    Vue.prototype.$map = me.map;
    // Send the event 'ol-map-mounted' with the OL map as payload
    EventBus.$emit('ol-map-mounted', me.map);

    // Capture the event 'findCorporateNetwork' emitted from sidepanel
    EventBus.$on('findCorporateNetwork', me.queryCorporateNetwork);
    EventBus.$on('closePopupInfo', me.closePopup);
    EventBus.$on('resetMap', me.resetMap);
    EventBus.$on('noMapReset', () => {
      this.noMapReset = false;
    });
    EventBus.$on('diveToFeatureEnd', () => {
      this.updateMousePosition();
    });

    // resize the map, so it fits to parent
    window.setTimeout(() => {
      me.map.setTarget(document.getElementById('ol-map-container'));
      me.map.updateSize();
      // adjust the bg color of the OL buttons (like zoom, rotate north, ...)
      me.setOlButtonColor();
      // Get Info
      me.setupMapClick();
      // Pointer Move
      me.setupMapPointerMove();
      // Map Hover out event
      me.setupMapHoverOut();
      // Map change resolution even
      me.setupMapChangeResolution();
      // Move end event
      this.setupMapMoveEnd();
      // Setup slideshow;
      this.setupMapFlyToSlideshow();
      // Create popup overlay for get info
      me.createPopupOverlay();
      // Fetch gas pipes entities for styling
      me.fetchColorMapEntities();
      // Remove layers with no entity property as it will
      // not work with Corporate Networks. (A describe fetaure type )
      // for every layer is needed.
      me.fetchDescribeFeatureTypes();
      if (this.activeLayerGroup.region === 'local') {
        EventBus.$emit('zoomToLocation');
      }
    }, 200);
  },
  created() {
    const me = this;
    // Make map rotateable according to property
    const attribution = new Attribution({
      collapsible: true,
    });

    // Need to reference as we should deactive double click zoom when there
    // are active interaction like draw/modify
    this.dblClickZoomInteraction = new DoubleClickZoom();
    me.map = new Map({
      layers: [],
      interactions: defaultInteractions({
        altShiftDragRotate: me.rotateableMap,
        doubleClickZoom: false,
        pinchRotate: false,
      }).extend([this.dblClickZoomInteraction]),
      controls: defaultControls({
        attribution: false,
        zoom: false,
      }).extend([attribution]),
      view: new View({
        center: me.center || [0, 0],
        minResolution: me.minResolution || 0.25,
        maxResolution: me.maxResolution || 64000,
      }),
    });
    // Add map to the vuex store.
    me.setMap(me.map);
    // Create layers from config and add them to map
    me.resetMap();
    me.createLayers();
    // Event bus setup for managing interactions
    EventBus.$on('ol-interaction-activated', startedInteraction => {
      me.activeInteractions.push(startedInteraction);
    });
    EventBus.$on('ol-interaction-stoped', stopedInteraction => {
      me.activeInteractions = Array.from(new Set(me.activeInteractions));
      me.activeInteractions = me.activeInteractions.filter(interaction => interaction !== stopedInteraction);
    });
  },

  methods: {
    resetAfterSlide() {
      if (this.slideshow.isRunning) {
        this.slideshow.isRunning = false;
        this.stopSlideshow();
        if (this.slideshow.videoTimeout) {
          clearTimeout(this.slideshow.videoTimeout);
          this.slideshow.videoTimeout = null;
        }
        this.slideshow.videoSrc = null;
        this.slideshow.videoIsDirect = false;
        this.slideshow.photoSlide = null;
        this.slideshow.overlayUrl = null;
        _slideshowPendingOverlay = undefined;
        this.slideshow.currentIndex = 0;
        if (this.slideshow.hasNavigated) {
          this.slideshow.hasNavigated = false;
          _slideshowHasNavigated = false;
          // Close feature popup and html layer sidebars
          this.popup.activeFeature = null;
          this.popup.showInSidePanel = false;
          this.lastSelectedLayer = null;
          // Reset layer visibility to app-conf defaults
          this.map
            .getLayers()
            .getArray()
            .forEach(layer => {
              const name = layer.get('name');
              if (!name) return;
              const conf = this.$appConfig.map.layers.find(l => l.name === name);
              if (conf !== undefined) layer.setVisible(!!conf.visible);
            });
          // Reset view to home group defaults (parse from homeHash, not current active group)
          const homeNavbarGroup = this.slideshow.homeHash?.split('/')[1];
          const groupConf = this.$appConfig.map.groups?.[homeNavbarGroup];
          if (groupConf?.center) this.map.getView().setCenter(fromLonLat(groupConf.center));
          if (groupConf?.resolution) this.map.getView().setResolution(groupConf.resolution);
          // Navigate to home route (clears slideshow URL params)
          if (this.slideshow.homeHash) window.location.hash = this.slideshow.homeHash;
        }
        this.initMapFly();
      }
    },
    toggleSlideshow() {
      if (this.slideshow.userStopped) {
        this.slideshow.userStopped = false;
        this.initMapFly();
      } else {
        this.slideshow.userStopped = true;
        this.stopSlideshow();
        if (this.slideshow.videoTimeout) {
          clearTimeout(this.slideshow.videoTimeout);
          this.slideshow.videoTimeout = null;
        }
        this.slideshow.videoSrc = null;
        this.slideshow.videoIsDirect = false;
        this.slideshow.photoSlide = null;
        this.slideshow.overlayUrl = null;
        this.slideshow.isRunning = false;
        _slideshowPendingOverlay = undefined;
      }
    },
    onVideoError() {
      if (this.slideshow.videoTimeout) {
        clearTimeout(this.slideshow.videoTimeout);
        this.slideshow.videoTimeout = null;
      }
      this.slideshow.videoSrc = null;
      this.slideshow.videoIsDirect = false;
      if (this.slideshow.isRunning) {
        const delay = (this.$appConfig.map.flyToSlideshow?.delayInSecondsBetweenFrames || 3) * 1000;
        this.slideshow.timer = new Timer(this.mapFlyToFn, delay);
        this.mapFlyToFn();
      }
    },
    /**
     * Creates the OL layers due to the map "layers" array in app config.
     * @return {ol.layer.Base[]} Array of OL layer instances
     */
    createLayers() {
      const me = this;
      // Get Info layer
      me.createGetInfoLayer();
      const visibleLayers = this.visibleGroup.layers;
      // World Overlay Layer and selected features layer for corporate network
      me.createWorldExtentOverlayLayer();
      me.createSelectedCorpNetworkLayer();
      // Create layers from config
      this.$appConfig.map.layers.forEach(lConf => {
        const layerIndex = visibleLayers.indexOf(lConf.name);
        if (layerIndex === -1) return;
        const layer = LayerFactory.getInstance(lConf, layerIndex);
        layer.setZIndex(layerIndex);
        // Restore the previous layer visibility state if exists.
        if (layer.get('name') in this.layerVisibilityState) {
          layer.setVisible(this.layerVisibilityState[layer.get('name')]);
        }
        if (layer.get('name')) {
          me.setLayer(layer);
        }
      });
      const backgroundColor = this.visibleGroup?.backgroundColor || '#ffffff';
      document.documentElement.style.setProperty('--viewer-background-color', backgroundColor);
    },
    resetLayersVisibility() {
      const visibleLayers = this.visibleGroup.layers;
      this.map.getLayers().forEach(layer => {
        const layerIndex = visibleLayers.indexOf(layer.get('name'));
        if (layerIndex === -1) return;
        this.$appConfig.map.layers.forEach(lConf => {
          if (lConf.name === layer.get('name')) {
            layer.setVisible(!!lConf.visible);
          }
        });
      });
    },
    /**
     * Creates a layer to visualize selected GetInfo features.
     */
    createGetInfoLayer() {
      // For Vector selection
      const source = new VectorSource({
        wrapX: false,
      });
      const vector = new VectorLayer({
        name: 'Get Info Layer',
        zIndex: 3000,
        source,
        style: popupInfoStyle(),
      });
      this.popup.highlightLayer = vector;
      this.map.addLayer(vector);
    },

    /**
     * Creates a layer to visualize selected GetInfo features.
     */
    createWorldExtentOverlayLayer() {
      // For Vector selection
      const source = new VectorSource({
        wrapX: true,
      });
      const vector = new VectorLayer({
        name: 'World Extent Layer',
        isInteractive: false,
        queryable: false,
        zIndex: 2000,
        source,
        style: worldOverlayFill(),
      });
      this.popup.worldExtentLayer = vector;
      this.map.addLayer(vector);
    },

    /**
     * Create a layer to visualize selected corporate network features.
     */
    createSelectedCorpNetworkLayer() {
      // For Vector selection
      const source = new VectorSource({
        wrapX: true,
      });
      const vector = new VectorLayer({
        name: 'Corporate Selected Network Layer',
        zIndex: 2500,
        hoverable: true,
        source,
        style: networkCorpHighlightStyle(),
      });
      this.popup.selectedCorpNetworkLayer = vector;
      this.map.addLayer(vector);
    },

    /**
     * Create Vector Tile Highligh layer.
     */

    createVTHighlightLayer(source) {
      // For Vector tiles selection.
      const vectorTileLayer = new VectorTileLayer({
        renderMode: 'vector',
        source,
        zIndex: 100,
        hoverable: true,
        style: feature => {
          if (this.popup.activeFeature && this.popup.activeFeature.getId() === feature.getId()) {
            return popupInfoStyle()(feature);
          }
        },
      });
      this.popup.highlightVectorTileLayer = vectorTileLayer;
      this.map.addLayer(this.popup.highlightVectorTileLayer);
    },

    /**
     * Sets the background color of the OL buttons to the color property.
     */
    setOlButtonColor() {
      const color = this.color.primary;
      if (isCssColor(color)) {
        // directly apply the given CSS color
        const rotateEl = document.querySelector('.ol-rotate');
        if (rotateEl) {
          rotateEl.className += ' elevation-5';
          rotateEl.borderRadius = '40px';
          const rotateElStyle = document.querySelector('.ol-rotate .ol-rotate-reset').style;
          rotateElStyle.backgroundColor = color;
          rotateElStyle.borderRadius = '40px';
        }
        const attrEl = document.querySelector('.ol-attribution');
        if (attrEl) {
          attrEl.className += ' elevation-5';
          const elStyle = document.querySelector(".ol-attribution button[type='button']").style;
          elStyle.backgroundColor = color;
          elStyle.borderRadius = '40px';
        }
      } else {
        // apply vuetify color by transforming the color to the corresponding
        // CSS class (see https://vuetifyjs.com/en/framework/colors)
        const [colorName, colorModifier] = color.toString().trim().split(' ', 2);

        if (document.querySelector('.ol-rotate')) {
          document.querySelector('.ol-rotate .ol-rotate-reset').classList.add(colorName);
          document.querySelector('.ol-rotate .ol-rotate-reset').classList.add(colorModifier);
        }
      }
    },

    /**
     * Show popup for the get info module.
     */
    createPopupOverlay() {
      const me = this;
      me.popup.popupOverlay = new Overlay({
        element: me.$refs.popup.$el,
        autoPan: false,
        autoPanMargin: 40,
        autoPanAnimation: {
          duration: 250,
        },
      });
      me.map.addOverlay(me.popup.popupOverlay);
    },

    /**
     * Closes the popup if user click X button.
     */
    closePopup() {
      const me = this;
      if (me.popup.popupOverlay) {
        me.popup.popupOverlay.setPosition(undefined);
        me.popup.isVisible = false;
      }

      // Clear highligh feature (Don't clear if a corporate network entity is selected)
      if (me.popup.highlightLayer) {
        this.popup.highlightLayer.getSource().clear();
      }
      if (me.popup.highlightVectorTileLayer) {
        me.map.removeLayer(me.popup.highlightVectorTileLayer);
      }

      if (!this.selectedCoorpNetworkEntity) {
        me.popup.activeFeature = null;
        me.popup.activeLayer = null;
      }
      me.popup.showInSidePanel = false;
    },

    /**
     * Show getInfo popup.
     */
    showPopup(clickCoord) {
      // Clear highligh feature (Don't clear if a corporate network entity is selected)
      if (this.selectedCoorpNetworkEntity) {
        this.popup.highlightLayer.getSource().clear();
      }

      const position = this.popup.activeFeature.getGeometry().getCoordinates();
      // Correct popup position (used feature coordinates insteaad of mouse)
      let closestPoint;
      // Closest point doesn't work with vector tile layers.
      if (position) {
        closestPoint = this.popup.activeFeature.getGeometry().getClosestPoint(clickCoord);
      } else {
        closestPoint = clickCoord;
      }
      this.map.getView().animate({
        center: closestPoint,
        duration: 400,
      });
      this.popup.popupOverlay.setPosition(closestPoint);
      this.popup.isVisible = true;
      this.popup.title = 'Info';
    },
    /**
     * Zooms to feature, add a cloned feature to the highlight layer and set the position of popup undefined
     * move the popup content to sidepanel and replace legend with feature image if exist.
     *
     */
    zoomToFeature() {
      const geometry = this.popup.activeFeature.getGeometry();
      this.popup.highlightLayer.getSource().clear();
      const clonedFeature = this.popup.activeFeature.clone();
      clonedFeature.set('isClone', true);
      if (['Point', 'MultiPoint'].includes(geometry.getType())) {
        const layerStyle = this.popup.activeLayer.getStyle();
        clonedFeature.setStyle(feature => {
          const styles = [];
          const popupInfoStyleObj = popupInfoStyle()(feature);
          if (Array.isArray(popupInfoStyleObj)) {
            styles.push(...popupInfoStyleObj);
          } else {
            styles.push(popupInfoStyleObj);
          }
          if (layerStyle instanceof Function) {
            const layerStyleObj = layerStyle(feature);
            if (Array.isArray(layerStyleObj)) {
              layerStyleObj.forEach(style => {
                if (style.setZIndex) {
                  style.setZIndex(2000);
                }
              });
              styles.push(...layerStyleObj);
            } else {
              if (layerStyleObj.setZIndex) {
                layerStyleObj.setZIndex(2000);
              }
              styles.push(layerStyleObj);
            }
          } else if (Array.isArray(layerStyle)) {
            styles.push(...layerStyle);
          } else {
            styles.push(layerStyle);
          }
          return styles;
        });
      }
      this.popup.highlightLayer.getSource().addFeature(clonedFeature);
      if (!['Point', 'MultiPoint'].includes(geometry.getType())) {
        // Zoom to extent adding a padding to the extent
        this.previousMapPosition = {
          center: this.map.getView().getCenter(),
          zoom: this.map.getView().getZoom(),
        };

        this.map.getView().fit(geometry.getExtent(), {
          padding: [100, 100, 100, 100],
          duration: 800,
        });
      }
      setTimeout(() => {
        this.selectedCoorpNetworkEntity = null;
      }, 800);
      // Close popup
      this.popup.popupOverlay.setPosition(undefined);
      this.popup.showInSidePanel = true;
    },

    /**
     * Map pointer move event .
     */
    setupMapPointerMove() {
      // create a span to show map tooltip
      const overlayEl = document.createElement('div');
      overlayEl.className = 'tooltip';
      this.overlayEl = overlayEl;
      // wrap the tooltip span in a OL overlay and add it to map
      this.overlay = new Overlay({
        element: overlayEl,
        offset: [22, 12],
        positioning: 'center-left',
        stopEvent: true,
        insertFirst: false,
      });
      this.map.addOverlay(this.overlay);

      this.mapPointerMoveListenerKey = this.map.on('pointermove', evt => {
        if (evt.dragging || this.activeInteractions.length > 0) {
          return;
        }

        let feature;
        let layer;
        if (this.isEditingLayer === false && this.isEditingPost === false && !this.analysisEditType) {
          this.map.forEachFeatureAtPixel(
            evt.pixel,
            (f, l) => {
              // Order of features is based is based on zIndex.x
              // First feature is on top, last feature is on bottom.
              if (!feature && l.get('isInteractive') !== false) {
                feature = f;
                layer = l;
              }
            },
            {
              hitTolerance: 3,
            }
          );

          this.map.getTarget().style.cursor = feature ? 'pointer' : '';
          // For cluster features
          if (feature && Array.isArray(feature.get('features'))) {
            const size = feature.get('features').length;
            if (size === 1) {
              feature = feature.get('features')[0];
            } else {
              return;
            }
          }

          if (!feature || !layer.get('hoverable')) {
            overlayEl.innerHTML = null;
            this.overlay.setPosition(undefined);
          } else {
            if (!feature) return;
            if (this.popup.activeFeature && this.popup.activeFeature.getId() === `clone.${feature.getId()}`) return;

            let attr = '';
            if (feature.get('translations')) {
              const translations = JSON.parse(feature.get('translations'));
              if (translations[this.$i18n.locale]) {
                attr = translations[this.$i18n.locale].title;
              } else {
                attr =
                  feature.get('hoverAttribute') || feature.get('title') || feature.get('entity') || feature.get('NAME');
              }
            } else {
              attr =
                feature.get('hoverAttribute') || feature.get('title') || feature.get('entity') || feature.get('NAME');
            }

            if (!attr) return;
            if (layer.get('styleObj')) {
              const {hoverTextColor, hoverBackgroundColor} = JSON.parse(layer.get('styleObj'));

              // eslint-disable-next-line no-unused-expressions
              hoverBackgroundColor && overlayEl
                ? (overlayEl.style.backgroundColor = hoverBackgroundColor)
                : (overlayEl.style.backgroundColor = '');

              // eslint-disable-next-line no-unused-expressions
              hoverTextColor && overlayEl ? (overlayEl.style.color = hoverTextColor) : (overlayEl.style.color = '');
            }
            if (
              (!feature.get('entity') && this.selectedCoorpNetworkEntity) ||
              (feature.get('entity') &&
                this.selectedCoorpNetworkEntity &&
                this.splittedEntities &&
                !this.splittedEntities.some(substring => feature.get('entity').includes(substring)))
            ) {
              return;
            }
            if (attr && attr !== ' ') {
              overlayEl.innerHTML = attr;
              this.overlay.setPosition(evt.coordinate);
            }
          }
        }
        this.mousePosition = this.map.getEventPixel(evt.originalEvent);
        // Render is only triggered for spotlight which is visible in zoom levels below 20
        const resolutionLevel = this.map.getView().getResolution();
        if (resolutionLevel <= 40) {
          this.map.render();
        }
      });
    },
    setupMapHoverOut() {
      const element = this.map.getTargetElement();

      if (element) {
        const me = this;
        element.onmouseleave = debounce(() => {
          me.updateMousePosition();
        }, 50);
      }
    },
    setupMapChangeResolution() {
      const me = this;
      me.currentResolution = this.map.getView().getResolution();
      this.map.getView().on(
        'change:resolution',
        debounce(() => {
          const res = me.map.getView().getResolution();
          me.currentResolution = res;
        }, 100)
      );
    },
    updateMousePosition() {
      const me = this;
      if (me.popup.activeFeature && ['Point', 'MultiPoint'].includes(me.popup.activeFeature.getGeometry().getType())) {
        const coordinate = me.popup.activeFeature.getGeometry().getCoordinates();
        const pixel = me.map.getPixelFromCoordinate(coordinate);
        if (pixel) {
          me.mousePosition = pixel;
          const resolutionLevel = this.map.getView().getResolution();
          if (resolutionLevel <= 20) {
            this.map.render();
          }
        }
      }
    },

    setupMapMoveEnd() {
      // After the map moveend event fires, determine if the instructions
      // for using the spotlights should be shown based on zoom level.
      this.map.on('moveend', () => {
        const resolutionLevel = this.map.getView().getResolution();
        if (resolutionLevel <= 4) {
          this.spotlightMessage = true;
        } else {
          this.spotlightMessage = false;
        }
      });
    },

    setupMapMoveStart() {},

    /**
     * Map click event for Module.
     */
    setupMapClick() {
      const me = this;
      const map = me.map;

      me.mapClickListenerKey = map.on('click', async evt => {
        if (me.activeInteractions.length > 0 || me.analysisEditType || me.isEditingLayer) {
          return;
        }

        if (me.lastSelectedLayer) {
          me.lastSelectedLayer = undefined;
        }

        let feature;
        let layer;
        this.map.forEachFeatureAtPixel(
          evt.pixel,
          (f, l) => {
            // Order of features is based is based on zIndex.
            // First feature is on top, last feature is on bottom.
            if (f && f.get('isClone')) {
              return false;
            }
            if (!feature && l.get('isInteractive') !== false && l.get('queryable') !== false) {
              feature = f;
              layer = l;
            }
          },
          {
            hitTolerance: 3,
          }
        );

        if (feature && me.sidebarState === false) {
          me.sidebarState = true;
        }

        // For cluster features
        if (feature && Array.isArray(feature.get('features'))) {
          const size = feature.get('features').length;
          if (size === 1) {
            feature = feature.get('features')[0];
          } else {
            const extent = createEmpty();
            const clusterMembers = feature.get('features');
            clusterMembers.forEach(feature => extend(extent, feature.getGeometry().getExtent()));
            const view = me.map.getView();
            view.fit(extent, {duration: 500, padding: [100, 100, 100, 100]});
            return;
          }
        }

        // Check if layer is interactive
        if ((layer && layer.get('isInteractive') === false) || (layer && layer.get('queryable') === false)) return;

        if (feature && !feature.get('entity') && this.selectedCoorpNetworkEntity) return;

        if (
          feature &&
          feature.get('entity') &&
          this.selectedCoorpNetworkEntity &&
          this.splittedEntities &&
          !this.splittedEntities.some(substring => feature.get('entity').includes(substring))
        ) {
          return;
        }

        me.closePopup();
        // EventBus.$emit('clearEditHtml');

        if ((this.selectedCoorpNetworkEntity || me.isEditingPost || me.isEditingHtml) && !layer) {
          return;
        }

        this.popup.activeLayer = layer;
        // Clear lightbox images array
        if (this.lightBoxImages) {
          this.lightBoxImages = [];
        }

        if (feature) {
          const props = feature.getProperties();
          // Check if feature has video link
          if (props.websiteUrl) {
            const mediabox = new MediaLightBox(props.websiteUrl, '', 'website');
            mediabox.open();
            return;
          }
          if (props.videoSrc || props.vimeoSrc || props.websiteUrl) {
            const mediabox = new MediaLightBox(
              props.videoSrc || props.vimeoSrc || props.websiteUrl,
              props.caption || props.vimeoTitle
            );
            mediabox.open();
            return;
          }
          // Check if feature has lightbox array of images
          if (props.lightbox) {
            const images = Array.isArray(props.lightbox) ? props.lightbox : JSON.parse(props.lightbox);
            if (!Array.isArray(images)) return;
            images.forEach(image => {
              let imageUrl;
              let caption = '';
              if (typeof image === 'object') {
                // Image is stored as object. Get imageUrl and caption values
                imageUrl = image.imageUrl;
                caption = image.caption;
              } else {
                // Image is stored as a string
                imageUrl = image;
              }
              const url = UrlUtil.parseUrl(imageUrl);
              this.lightBoxImages.push({
                src: url,
                thumb: url,
                caption,
              });
            });
            // Open lightbox
            this.$refs.lightbox.open();
            // Popup will not be opened if there are lightbox images
            return;
          }
          this.previousMapPosition = null;

          this.popup.activeFeature = feature.clone ? feature.clone() : feature;

          // Add id reference
          if (feature instanceof RenderFeature) {
            const urls = layer.getSource().getUrls()[0];
            const url = urls.match('tms/1.0.0/(.*)@EPSG');
            if (!urls.includes('geoserver')) return;
            if (!Array.isArray(url) || url.length < 2) return;
            const geoserverLayerName = url[1];
            const response = await http.get('./geoserver/wfs', {
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
              this.popup.activeFeature = olFeatures[0];
              feature = olFeatures[0];
            } else {
              return;
            }
          }
          if (feature.getId()) {
            this.popup.activeFeature.setId(`clone.${feature.getId()}`);
          }

          if (
            (this.selectedCoorpNetworkEntity || this.isEditingPost || this.isEditingHtml) &&
            this.popup.activeFeature
          ) {
            this.popup.highlightLayer.getSource().clear();
            this.popup.activeFeature.setStyle(null);
            this.popup.highlightLayer.getSource().addFeature(this.popup.activeFeature);
          }

          if (this.selectedCoorpNetworkEntity || this.isEditingPost || this.isEditingHtml) {
            this.showPopup(evt.coordinate);
          } else {
            this.zoomToFeature();
          }
        }
      });
    },
    /**
    Slideshow map position every x seconds:
     */
    setupMapFlyToSlideshow() {
      const flyToSlideshow = this.$appConfig.map.flyToSlideshow;
      const maplinks = flyToSlideshow?.maplinks;
      const fileRef = maplinks?.length === 1 && !maplinks[0].startsWith('#') ? maplinks[0] : null;

      const init = () => {
        // Derive home hash from app-conf defaultActiveGroup, NOT from window.location.hash,
        // so it stays correct even when Map.vue remounts mid-slideshow at a non-home route.
        const defaultGroup = this.$appConfig.map.defaultActiveGroup;
        if (defaultGroup) {
          const mode = window.location.hash.split('?')[0].split('/')[2] || 'extractivista';
          _slideshowHomeHash = `#/${defaultGroup}/${mode}`;
        } else if (!_slideshowHomeHash) {
          _slideshowHomeHash = window.location.hash.split('?')[0];
        }
        this.slideshow.homeHash = _slideshowHomeHash;
        // Restore overlay carried across a map-slide navigation/remount
        if (_slideshowHasNavigated) this.slideshow.hasNavigated = true;
        if (_slideshowPendingOverlay !== undefined) {
          this.slideshow.overlayUrl = _slideshowPendingOverlay;
          _slideshowPendingOverlay = undefined;
        }
        this.initMapFly();
        this.map.on(['pointerdrag', 'moveend'], () => {
          if (this.slideshow.isFlying === false) {
            this.initMapFly();
          }
        });
        // pointermove only fires for actual pointer movement over the map canvas,
        // not for control overlays (timeslider, legend) or programmatic view changes
        this.map.on('pointermove', () => {
          if (!this.slideshow.isFlying) this.resetAfterSlide();
        });
      };

      if (fileRef) {
        fetch(`./static/${fileRef}.json`)
          .then(r => r.json())
          .then(links => {
            // Filter out comment/documentation objects (keep strings, video, photo, and map objects)
            flyToSlideshow.maplinks = links.filter(
              l => typeof l === 'string' || (typeof l === 'object' && l !== null && (l.video || l.photo || l.map))
            );
            init();
          })
          .catch(() => init());
      } else {
        init();
      }
    },
    initMapFly() {
      if (this.slideshow.userStopped) return;
      this.stopSlideshow();
      // Timeout for initial start.
      this.slideshow.timeout = setTimeout(() => {
        this.slideshow.isRunning = true;

        // Timer for slideshow.
        this.slideshow.timer = new Timer(
          this.mapFlyToFn,
          this.$appConfig.map.flyToSlideshow.delayInSecondsBetweenFrames * 1000
        );

        this.slideshow.timer.start();
      }, this.$appConfig.map.flyToSlideshow.delayInSecondsForInitialStart * 1000);
    },
    stopSlideshow() {
      if (this.slideshow.timer) {
        this.slideshow.timer.stop();
      }
      if (this.slideshow.timeout) {
        clearTimeout(this.slideshow.timeout);
      }
    },
    mapFlyToFn() {
      if (this.isEditingLayer || this.isEditingPost || this.isEditingHtml || this.selectedLayer) {
        this.initMapFly();
        return;
      }
      const flyToSlideshow = this.$appConfig.map.flyToSlideshow;
      if (flyToSlideshow) {
        if (this.slideshow.currentIndex > flyToSlideshow.maplinks.length - 1) {
          this.slideshow.currentIndex = 0;
        }
        const position = flyToSlideshow.maplinks[this.slideshow.currentIndex];
        this.slideshow.currentIndex += 1;
        this.slideshow.hasNavigated = true;
        _slideshowHasNavigated = true;
        // Clear any feature the previous slide opened before advancing
        this.popup.activeFeature = null;
        this.popup.showInSidePanel = false;

        // Optional instructional panel image shown on top of any slide type
        this.slideshow.overlayUrl =
          position && typeof position === 'object' && position.overlay ? position.overlay : null;

        if (position && typeof position === 'object' && position.video) {
          // Video slide — stop the interval timer and show the overlay.
          // Direct file URLs (mp4/webm) use <video autoplay muted> — no CAPTCHA, no iframe.
          // Embed URLs (YouTube/Vimeo) use <iframe>; mute=1 is appended automatically so the
          // browser's autoplay policy always allows it (muted autoplay needs no user gesture).
          const src = position.video;
          const isDirect = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(src);
          this.slideshow.videoIsDirect = isDirect;
          this.slideshow.videoSrc =
            isDirect || src.includes('mute=1') ? src : src + (src.includes('?') ? '&' : '?') + 'mute=1';
          this.stopSlideshow();
          const duration = (position.duration || flyToSlideshow.delayInSecondsBetweenFrames) * 1000;
          this.slideshow.videoTimeout = setTimeout(() => {
            this.slideshow.videoSrc = null;
            this.slideshow.videoTimeout = null;
            if (this.slideshow.isRunning) {
              // Re-arm the interval timer for slides after next, then advance immediately.
              // If the next slide is also a video/photo, mapFlyToFn() will stop this timer.
              this.slideshow.timer = new Timer(this.mapFlyToFn, flyToSlideshow.delayInSecondsBetweenFrames * 1000);
              this.mapFlyToFn();
            }
          }, duration);
        } else if (position && typeof position === 'object' && position.photo) {
          // Photo slide — fetch the feature from GeoServer WFS, extract the lightbox URL.
          // Format: { "photo": "fotos_bioculturales.5", "photoIndex": 0, "duration": 12 }
          // The feature's "lightbox" property is a JSON array of { imageUrl, caption } objects.
          const [layerName] = position.photo.split('.');
          const wfsUrl =
            `./geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature` +
            `&typename=workspace1:${layerName}&featureID=${position.photo}&outputFormat=application/json`;
          this.stopSlideshow();
          const duration = (position.duration || flyToSlideshow.delayInSecondsBetweenFrames) * 1000;
          const advanceAfterPhoto = () => {
            this.slideshow.photoSlide = null;
            this.slideshow.videoTimeout = null;
            if (this.slideshow.isRunning) {
              this.slideshow.timer = new Timer(this.mapFlyToFn, flyToSlideshow.delayInSecondsBetweenFrames * 1000);
              this.mapFlyToFn();
            }
          };
          fetch(wfsUrl)
            .then(r => r.json())
            .then(data => {
              if (!this.slideshow.isRunning) return;
              const props = data.features?.[0]?.properties;
              if (!props) return advanceAfterPhoto();
              let lightbox = props.lightbox;
              if (typeof lightbox === 'string') lightbox = JSON.parse(lightbox);
              const photo = Array.isArray(lightbox) ? lightbox[position.photoIndex || 0] : null;
              if (!photo?.imageUrl) return advanceAfterPhoto();
              this.slideshow.photoSlide = {url: photo.imageUrl, caption: photo.caption || ''};
              this.slideshow.videoTimeout = setTimeout(advanceAfterPhoto, duration);
            })
            .catch(() => {
              if (this.slideshow.isRunning) advanceAfterPhoto();
            });
        } else {
          // Map URL slide — plain string "#/..." or object { map: "#/...", overlay: "..." }
          const hash = typeof position === 'object' ? position.map : position;
          // Store overlay so init() can restore it after Map.vue remounts on navigation
          _slideshowPendingOverlay = typeof position === 'object' && position.overlay ? position.overlay : null;
          this.slideshow.isFlying = true;
          window.location.href = hash;
          setTimeout(() => {
            this.slideshow.isFlying = false;
          }, 50);
        }
      }
    },
    spotlight(e) {
      const ctx = e.context;
      const pixelRatio = e.frameState.pixelRatio;
      ctx.save();
      ctx.beginPath();
      if (this.mousePosition && !this.$vuetify.breakpoint.smAndDown) {
        // Only show a circle around the mouse --
        ctx.arc(
          this.mousePosition[0] * pixelRatio,
          this.mousePosition[1] * pixelRatio,
          this.radius * pixelRatio,
          0,
          2 * Math.PI
        );

        ctx.lineWidth = 6 * pixelRatio;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.stroke();
      } else if (this.$vuetify.breakpoint.smAndDown) {
        // Show a circle around the map center --
        const centerX = e.frameState.size[0] / 2;
        const centerY = e.frameState.size[1] / 2;
        const radius = Math.min(centerX, centerY) * 0.5;
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.stroke();
      }
      ctx.clip();
    },
    queryCorporateNetwork() {
      const entity = this.popup.activeFeature.get('entity');
      const workspace = this.geoserverWorkspace;
      if (!entity) return;
      this.selectedCoorpNetworkEntity = entity;
      if (!this.layersWithEntityField || !this.splittedEntities) return;
      const visibleLayers = Array.isArray(this.visibleGroup?.layers) ? this.visibleGroup.layers : [];
      /// ////////////////////
      if (!this.queryLayersGeoserverNames) {
        const queryableLayers = [];
        const flatLayers = [];
        this.$appConfig.map.layers.forEach(layer => {
          if (visibleLayers.includes(layer.name)) {
            if (layer.type === 'GROUP') {
              layer.layers.forEach(subLayer => {
                flatLayers.push(subLayer);
              });
            } else {
              flatLayers.push(layer);
            }
          }
        });
        flatLayers.forEach(layer => {
          if (layer.includeInSearch !== false) {
            queryableLayers.push(layer);
          }
        });

        this.queryLayersGeoserverNames = extractGeoserverLayerNames(queryableLayers, this.layersWithEntityField)[
          workspace
        ].names.filter(name => this.layersWithEntityField.includes(name));
      }

      const filterArray = [];
      // eslint-disable-next-line no-shadow
      this.splittedEntities.forEach(entity => {
        filterArray.push(likeFilter('entity', `%${entity}%`));
      });
      if (filterArray.length === 0) return;
      let filter;
      // eslint-disable-next-line no-unused-expressions
      filterArray.length === 1 ? (filter = filterArray[0]) : (filter = orFilter(...filterArray));

      const promiseArray = [];
      this.queryLayersGeoserverNames.forEach(geoserverLayerName => {
        const wfsRequest = wfsRequestParser('EPSG:3857', workspace, [geoserverLayerName], filter);
        promiseArray.push(
          http.post(`./geoserver/${workspace}/wfs`, wfsRequest, {
            headers: {'Content-Type': 'text/xml'},
            layerName: geoserverLayerName,
          })
        );
      });

      this.progressLoading.value = true;
      this.progressLoading.message = 'Fetching data...';
      this.popup.highlightLayer.getSource().clear();
      this.popup.worldExtentLayer.getSource().clear();
      this.popup.selectedCorpNetworkLayer.getSource().clear();
      const mapLayers = this.map.getAllLayers();

      axios
        .all(promiseArray)
        .then(results => {
          const olFeatures = [];
          results.forEach(response => {
            if (response.data.features) {
              const olFeaturesArray = geojsonToFeature(response.data, {});
              const geoserverLayerName = response.config.layerName;
              olFeaturesArray.forEach(feature => {
                const firstTwoWords = feature.get('entity').split(' ').slice(0, 2).join(' ');

                if (firstTwoWords && this.splittedEntities.includes(firstTwoWords)) {
                  if (feature.getGeometry().getType() === 'Point') {
                    // Find all the layers that have this feature using geoserverLayerName
                    mapLayers.forEach(layer => {
                      const url = getLayerSourceUrl(layer.getSource());
                      if (url && url.includes(geoserverLayerName)) {
                        const clonedFeature = feature.clone();
                        clonedFeature.setStyle(layer.getStyle());
                        olFeatures.push(clonedFeature);
                      }
                    });
                  } else {
                    olFeatures.push(feature.clone());
                  }
                }
              });
            }
          });
          if (olFeatures) {
            this.popup.selectedCorpNetworkLayer.getSource().addFeatures(olFeatures);
            // Zoom to extent adding a padding to the extent
            const extent = olFeatures[0].getGeometry().getExtent().slice(0);
            olFeatures.forEach(feature => {
              extend(extent, feature.getGeometry().getExtent());
            });
            setTimeout(() => {
              this.map.getView().fit(extent, {
                padding: [50, 90, 90, 90],
                duration: 800,
              });
            }, 500);
            this.popup.popupOverlay.setPosition(undefined);

            const worldOverlayGeometry = fromExtent([
              -20037508.342789244, -20037508.342789244, 20037508.342789244, 20037508.342789244,
            ]);
            const worldExtentFeature = new Feature({
              geometry: worldOverlayGeometry,
            });
            this.popup.worldExtentLayer.getSource().addFeature(worldExtentFeature);
            this.progressLoading.value = false;
          }
        })
        .catch(error => {
          // handle error
          console.log(error);
          this.progressLoading.value = false;
          // TODO: Show snackbar for errors.
        });
    },
    fetchDescribeFeatureTypes() {
      const flatLayers = [];
      this.$appConfig.map.layers.forEach(layer => {
        if (layer.type === 'GROUP') {
          layer.layers.forEach(subLayer => {
            flatLayers.push(subLayer);
          });
        } else {
          flatLayers.push(layer);
        }
      });
      const geoserverLayerNames = extractGeoserverLayerNames(flatLayers);
      const workspace = this.geoserverWorkspace;
      if (!geoserverLayerNames[workspace]) return;
      const filterLayersWithEntity = [];
      geoserverLayerNames[workspace].names.forEach(geoserverLayerName => {
        http
          .get('./geoserver/wfs', {
            params: {
              service: 'WFS',
              version: ' 2.0.0',
              request: 'DescribeFeatureType',
              outputFormat: 'application/json',
              typeNames: `${workspace}:${geoserverLayerName}`,
            },
          })
          .then(response => {
            if (response.data && response.data.featureTypes) {
              const featureTypes = response.data.featureTypes;
              featureTypes.forEach(featureType => {
                featureType.properties.forEach(property => {
                  if (property.name === 'entity' && filterLayersWithEntity.indexOf(featureType.typeName) === -1) {
                    filterLayersWithEntity.push(featureType.typeName);
                  }
                });
              });
              this.layersWithEntityField = filterLayersWithEntity;

              Object.keys(geoserverLayerNames[workspace].mapped).forEach(layerName => {
                if (geoserverLayerNames[workspace].mapped[layerName] === geoserverLayerName) {
                  this.layersMetadata[layerName] = {
                    properties: featureTypes[0].properties,
                    typeName: featureTypes[0].typeName,
                  };
                }
              });
            }
          })
          .catch(() => {
            // handle error
          });
      });
    },
    isPopupRowVisible(item) {
      if (this.selectedCoorpNetworkEntity && this.popup.activeFeature) {
        return !this.hiddenProps.includes(item.property) && !['null', '---'].includes(item.value);
      }

      if (!['null', '---'].includes(item.value)) {
        return this.popup.diveVisibleProps.includes(item.property) && !this.hiddenProps.includes(item.property);
      }
      return false;
    },
    resetMap() {
      // Other Operational Layers
      if (!this.map) return;
      const visibleGroup = this.visibleGroup;
      // Set reset map group to true if the center is defined.
      if (!this.noMapReset || visibleGroup.center) {
        const isMobile = this.$vuetify.breakpoint.smAndDown;
        const center = isMobile ? visibleGroup.mobileCenter || visibleGroup.center : visibleGroup.center;
        const resolution = isMobile
          ? visibleGroup.mobileResolution || visibleGroup.resolution
          : visibleGroup.resolution;
        if (center) {
          this.map.getView().setCenter(fromLonLat(center));
        }
        if (resolution) {
          this.map.getView().setResolution(resolution);
        }
      }

      // Set reset map group to false if the center is defined.
      if (!visibleGroup.center) {
        this.noMapReset = false;
      }

      // if (visibleGroup.minResolution && visibleGroup.maxResolution) {
      //   this.map.getView().minResolution_ = visibleGroup.minResolution;
      //   this.map.getView().maxResolution_ = visibleGroup.maxResolution;
      // }
      this.closePopup();

      if (this.$appConfig.app.customNavigationScheme && this.$appConfig.app.customNavigationScheme == '1') {
        this.resetLayersVisibility();
      }
    },
    ...mapActions('map', {
      fetchColorMapEntities: 'fetchColorMapEntities',
    }),
    ...mapMutations('map', {
      setMap: 'SET_MAP',
      setLayer: 'SET_LAYER',
      setPersistentLayer: 'SET_PERSISTENT_LAYER',
      removeAllLayers: 'REMOVE_ALL_LAYERS',
    }),
  },
  computed: {
    ...mapGetters('map', {
      activeLayerGroup: 'activeLayerGroup',
      popupInfo: 'popupInfo',
      splittedEntities: 'splittedEntities',
      geoserverWorkspace: 'geoserverWorkspace',
      mobilePanelState: 'mobilePanelState',
      visibleGroup: 'visibleGroup',
      isTranslating: 'isTranslating',
    }),
    ...mapGetters('auth', {
      loggedUser: 'loggedUser',
    }),
    ...mapFields('app', {
      sidebarState: 'sidebarState',
    }),
    ...mapFields('map', {
      previousMapPosition: 'previousMapPosition',
      popup: 'popup',
      isEditingLayer: 'isEditingLayer',
      isEditingPost: 'isEditingPost',
      isEditingHtml: 'isEditingHtml',
      selectedLayer: 'selectedLayer',
      geoserverLayerNames: 'geoserverLayerNames',
      layersMetadata: 'layersMetadata',
      layersWithEntityField: 'layersWithEntityField',
      selectedCoorpNetworkEntity: 'selectedCoorpNetworkEntity',
      currentResolution: 'currentResolution',
      lastSelectedLayer: 'lastSelectedLayer',
      analysisEditType: 'analysisEditType',
    }),
    hiddenProps() {
      const hiddenProps = this.$appConfig.map.featureInfoHiddenProps;
      return hiddenProps || [];
    },
    activeLayerGroupConf() {
      const group = this.$appConfig.map.groups[this.activeLayerGroup.navbarGroup][this.activeLayerGroup.region];
      return group;
    },
    searchLabel() {
      const searchLabel = this.popup.activeLayer.get('searchLabel');
      if (searchLabel) {
        return searchLabel;
      }
      if (this.visibleGroup.searchLabel) {
        return this.visibleGroup.searchLabel.toUpperCase();
      }
      return 'CORPORATE NETWORK';
    },
  },
  watch: {
    activeInteractions() {
      if (!this.dblClickZoomInteraction) return;
      if (this.activeInteractions.length > 0) {
        this.dblClickZoomInteraction.setActive(false);
      } else {
        this.dblClickZoomInteraction.setActive(true);
      }
    },
    activeLayerGroup(newValue, oldValue) {
      if (oldValue.region === 'global') {
        this.noMapReset = false;
      }

      let clearMap = true;

      if (this.$appConfig.app.customNavigationScheme && this.$appConfig.app.customNavigationScheme === '2') {
        if (newValue.region === oldValue.region) {
          clearMap = false;
        }
      }
      if (clearMap) {
        // store layer visibility state before changing fuel group
        const mapLayers = this.map.getLayers().getArray();
        if (this.$appConfig.app.customNavigationScheme !== '1') {
          mapLayers.forEach(layer => {
            const name = layer.get('name');
            const visibility = layer.getVisible();
            this.layerVisibilityState[name] = visibility;
          });
        }
        this.removeAllLayers();
        this.closePopup();
        // Reset geoserver layer names array
        this.geoserverLayerNames = null;
        this.queryLayersGeoserverNames = null;
        this.createLayers();
        this.fetchColorMapEntities();
        if (['3', '1'].includes(this.$appConfig.app.customNavigationScheme)) {
          this.resetMap();
        }
      } else {
        this.resetMap();
      } //

      this.selectedCoorpNetworkEntity = null;
      // Emit group change event.
      EventBus.$emit('group-changed');
      EventBus.$emit('clearEditHtml');

      // Reset fromEvent to false
      setTimeout(() => {
        this.$route.meta.fromEvent = false;
      }, 1000);

      // If user has provider
      // const currentGroupRegion = this.$appConfig.map.groups[newValue.navbarGroup][newValue.region];
      // if (map)
    },
    isEditingLayer() {
      // Disables double click zoom when user is editing.
      this.dblClickZoomInteraction.setActive(!this.isEditingLayer);
    },
    mobilePanelState() {
      if (this.$vuetify.breakpoint.smAndDown) {
        this.$nextTick(() => {
          this.map.updateSize();
        });
      }
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
div.ol-attribution {
  bottom: 4px;
  border-radius: 40px;
}

div.ol-control {
  padding: 0px;
  border-radius: 40px;
}

div.ol-control button {
  margin: 0px !important;
}

/* Hover tooltip */
.tooltip {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-style: normal;
  position: relative;
  background-color: rgba(128, 128, 128, 0.9);
  border-radius: 4px;
  color: white;
  padding: 2px 8px;
  font-size: 14px;
  opacity: 1;
  font-weight: bold;
}

.tooltip::before {
  border-right: 6px solid transparent;
  border-left: 6px solid transparent;
  content: '';
  position: absolute;
  bottom: 40%;
  margin-left: -8px;
  left: 0%;
  transform: rotate(90deg);
}

.ol-attribution ul {
  margin: 0;
  padding: 0 0.5em;
  font-size: 0.7rem;
  line-height: 1.375em;
  color: #000;
  text-shadow: 0 0 2px #fff;
}

.spotlight-message {
  position: fixed;
  left: 40%;
  top: 70px;
  color: white;
  padding: 5px;
  border-radius: 5px;
  z-index: 100;
}

.slideshow-video-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.slideshow-video-overlay iframe {
  width: 80%;
  aspect-ratio: 16 / 9;
  border: none;
}

.slideshow-video-direct {
  width: 80%;
  max-height: 80vh;
  object-fit: contain;
}

.slideshow-toggle-btn {
  position: absolute;
  right: 12px;
  bottom: 36px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: transparent;
  border: 2px solid white;
  cursor: pointer;
  z-index: 230;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.slideshow-toggle-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
  display: block;
}

.slideshow-panel-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 210;
  pointer-events: none;
}

.slideshow-panel-img {
  max-width: 80%;
  max-height: 80vh;
  object-fit: contain;
}

.slideshow-photo-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.slideshow-photo-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 85%;
  max-height: 90%;
}

.slideshow-photo-content img {
  max-width: 100%;
  max-height: 75vh;
  object-fit: contain;
}

.slideshow-photo-caption {
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.85rem;
  text-align: center;
  margin-top: 12px;
  max-width: 680px;
  line-height: 1.4;
}
</style>
