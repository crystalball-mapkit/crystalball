<template>
  <div v-if="$appConfig.app.analysis && $appConfig.app.analysis.rShinyServerUrl" class="mt-4 mb-2">
    <!-- ANALYSIS SPEED DIAL -->
    <v-speed-dial
      :value="analysisSpeedDialOpen"
      @input="analysisSpeedDialOpen = $event"
      direction="left"
      transition="slide-x-transition"
      class="analysis-control"
    >
      <template v-slot:activator>
        <v-tooltip bottom>
          <template v-slot:activator="{on}">
            <v-btn
              :color="analysisEditType ? 'error' : color"
              dark
              fab
              small
              v-on="on"
              @click.stop="!!analysisEditType ? stopAnalysis() : (analysisSpeedDialOpen = !analysisSpeedDialOpen)"
            >
              <v-icon v-if="analysisSpeedDialOpen || analysisEditType">mdi-close</v-icon>
              <v-icon v-else>mdi-chart-areaspline</v-icon>
            </v-btn>
          </template>
          <span>{{
            !!analysisEditType || analysisSpeedDialOpen ? $t('general.close') : $t('tooltip.analyzePolygon')
          }}</span>
        </v-tooltip>
      </template>

      <!-- Draw Square Option -->
      <v-tooltip bottom>
        <template v-slot:activator="{on}">
          <v-btn fab dark small color="secondary" v-on="on" @click.stop="startAnalysis('square')">
            <v-icon>mdi-vector-square</v-icon>
          </v-btn>
        </template>
        <span>{{ $t('tooltip.drawSquare') }}</span>
      </v-tooltip>

      <!-- Draw Polygon Option -->
      <v-tooltip bottom>
        <template v-slot:activator="{on}">
          <v-btn fab dark small color="secondary" v-on="on" @click.stop="startAnalysis('polygon')">
            <v-icon>mdi-vector-polygon</v-icon>
          </v-btn>
        </template>
        <span>{{ $t('tooltip.drawPolygon') }}</span>
      </v-tooltip>

      <!-- Select Feature from Layer Option -->
      <v-tooltip bottom>
        <template v-slot:activator="{on}">
          <v-btn fab dark small color="secondary" v-on="on" @click.stop="startAnalysis('feature')">
            <v-icon>mdi-layers</v-icon>
          </v-btn>
        </template>
        <span>{{ $t('tooltip.selectPresetsFromLayer') }}</span>
      </v-tooltip>
    </v-speed-dial>

    <!-- ANALYSIS LAYER SELECTION DIALOG -->
    <v-dialog v-model="analysisLayersDialog" max-width="350" @keydown.esc="analysisLayersDialog = false">
      <v-card>
        <v-app-bar flat :color="color" height="50" dark>
          <v-icon class="mr-3">layers</v-icon>
          <v-toolbar-title>{{ $t('form.analysis.selectLayerPresets') }}</v-toolbar-title>
        </v-app-bar>
        <v-select
          class="mx-4 my-2"
          :items="analysisLayers"
          v-model="analysisDialogSelectedLayer"
          return-object
          item-value="values_.name"
          :label="$t('general.layers')"
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
            :disabled="!analysisDialogSelectedLayer"
            @click.native="selectAnalysisLayer"
          >
            {{ $t('general.ok') }}
          </v-btn>
          <v-btn :color="color" text @click.native="analysisLayersDialog = false">
            {{ $t('general.cancel') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import {Draw} from 'ol/interaction';
import {createBox} from 'ol/interaction/Draw';
import {unByKey} from 'ol/Observable';
import GeoJSON from 'ol/format/GeoJSON';
import {mapFields} from 'vuex-map-fields';
import {mapMutations} from 'vuex';
import {Mapable} from '../../../../mixins/Mapable';
import {EventBus} from '../../../../EventBus';

export default {
  name: 'analysis-control',
  mixins: [Mapable],
  props: {
    map: {type: Object, required: true},
    color: {type: String, default: 'primary'},
  },
  data: () => ({
    analysisSpeedDialOpen: false,
    analysisDrawInteraction: null,
    analysisLayersDialog: false,
    analysisDialogSelectedLayer: null,
    analysisFeatureSelectInteraction: null,
  }),
  computed: {
    ...mapFields('map', {
      analysisEditType: 'analysisEditType',
      analysisIframeUrl: 'analysisIframeUrl',
      editLayer: 'editLayer',
      highlightLayer: 'highlightLayer',
      isEditingLayer: 'isEditingLayer',
      isEditingPost: 'isEditingPost',
      mobilePanelState: 'mobilePanelState',
    }),
    flatLayers() {
      return this.map.getAllLayers();
    },
    analysisLayers() {
      return this.flatLayers.filter(
        l =>
          ['VECTORTILE', 'VECTOR'].includes(l.get('type')) &&
          l.get('name') &&
          l.get('legendDisplayName') &&
          l.get('queryable') !== false &&
          l.get('presetLayer') === true
      );
    },
  },
  methods: {
    selectAnalysisLayer() {
      this.analysisLayersDialog = false;
      this.analysisEditType = 'feature';
      if (!this.analysisDialogSelectedLayer.getVisible()) {
        this.analysisDialogSelectedLayer.setVisible(true);
      }
      this.setupFeatureSelectAnalysis();
    },

    startAnalysis(mode) {
      this.analysisSpeedDialOpen = false;
      if (mode === 'feature') {
        this.analysisLayersDialog = true;
        return;
      }

      this.analysisEditType = mode;
      // close other editing modes
      if (this.isEditingLayer) {
        EventBus.$emit('closeAll');
      }
      if (this.isEditingPost) {
        this.isEditingPost = false;
      }

      this.setupDrawAnalysis();
    },

    stopAnalysis() {
      this.analysisEditType = null;
      this.analysisSpeedDialOpen = false;
      this.analysisLayersDialog = false;
      this.analysisDialogSelectedLayer = null;

      // Remove feature select interaction
      if (this.analysisFeatureSelectInteraction) {
        unByKey(this.analysisFeatureSelectInteraction);
        this.analysisFeatureSelectInteraction = null;
      }

      // Remove draw interaction
      if (this.analysisDrawInteraction) {
        this.map.removeInteraction(this.analysisDrawInteraction);
        this.analysisDrawInteraction = null;
      }

      this.map.getTarget().style.cursor = '';
      if (this.editLayer) {
        this.editLayer.getSource().clear();
      }
      if (this.highlightLayer) {
        this.highlightLayer.getSource().clear();
      }
      this.analysisIframeUrl = null;
    },

    setupFeatureSelectAnalysis() {
      if (this.editLayer) {
        this.editLayer.getSource().clear();
      }
      if (this.highlightLayer) {
        this.highlightLayer.getSource().clear();
      }
      if (this.analysisFeatureSelectInteraction) {
        unByKey(this.analysisFeatureSelectInteraction);
        this.analysisFeatureSelectInteraction = null;
      }
      this.analysisFeatureSelectInteraction = this.map.on('click', this.onAnalysisFeatureSelect);

      this.map.getTarget().style.cursor = 'pointer';

      // Show guidance to user
      this.toggleSnackbar({
        type: 'info',
        message: this.$t('form.analysis.selectFeatureInstruction'),
        timeout: 3000,
        state: true,
      });
    },

    onAnalysisFeatureSelect(evt) {
      const selectedLayer = this.analysisDialogSelectedLayer;
      if (!selectedLayer) return;
      const features = this.map.getFeaturesAtPixel(evt.pixel, {
        layerFilter: layerCandidate => layerCandidate.get('name') === selectedLayer.get('name'),
        hitTolerance: 3,
      });

      if (features.length > 0) {
        const feature = features[0];
        this.processAnalysisFeature(feature);
      } else {
        this.toggleSnackbar({
          type: 'warning',
          message: this.$t('form.analysis.noFeatureFoundAtLocation'),
          timeout: 3000,
          state: true,
        });
      }
    },

    processAnalysisFeature(feature) {
      if (this.highlightLayer) {
        this.highlightLayer.getSource().clear();
      }
      if (this.editLayer) {
        this.editLayer.getSource().clear();
      }
      if (this.highlightLayer) {
        this.highlightLayer.getSource().addFeature(feature.clone());
      }
      if (this.$appConfig.app.analysis.zoomToFeatureOnSelect) {
        this.zoomToFeature(feature);
      }
      let queryParam;
      if (this.analysisDialogSelectedLayer && this.analysisDialogSelectedLayer.get('presetLayerName')) {
        // send "preset=NAME:VALUE"
        const presetName = this.analysisDialogSelectedLayer.get('presetLayerName');
        const value = feature.get('row_id') || feature.get('id') || feature.get('gid') || feature.get('ID');
        queryParam = `preset=${presetName}:${String(value).toLowerCase()}`;
      } else {
        // send geometry as geojson
        const geom = feature.getGeometry().clone();
        geom.transform('EPSG:3857', 'EPSG:4326');
        const geojson = new GeoJSON().writeGeometryObject(geom);
        queryParam = `geojson=${encodeURIComponent(JSON.stringify(geojson))}`;
      }
      const ts = Date.now();
      let baseUrl = this.$appConfig.app.analysis.rShinyServerUrl;
      if (!baseUrl.endsWith('/')) {
        baseUrl += '/';
      }
      const url = `${baseUrl}?${queryParam}&_ts=${ts}`;
      console.log('Generated Analysis URL:', url);
      this.analysisIframeUrl = url;
      if (this.$vuetify.breakpoint.smAndDown) {
        this.mobilePanelState = true;
      }
    },

    setupDrawAnalysis() {
      if (this.editLayer) {
        this.editLayer.getSource().clear();
      }
      if (this.highlightLayer) {
        this.highlightLayer.getSource().clear();
      }

      const drawOptions = {
        source: this.editLayer.getSource(),
        type: this.analysisEditType === 'square' ? 'Circle' : 'Polygon',
      };
      if (this.analysisEditType === 'square') {
        drawOptions.geometryFunction = createBox();
      }

      this.analysisDrawInteraction = new Draw(drawOptions);

      // Clear previous geometry BEFORE new draw starts
      this.analysisDrawInteraction.on('drawstart', () => {
        if (this.editLayer) {
          this.editLayer.getSource().clear();
        }
        if (this.highlightLayer) {
          this.highlightLayer.getSource().clear();
        }
      });

      this.analysisDrawInteraction.on('drawend', this.onAnalysisDrawEnd);
      this.map.addInteraction(this.analysisDrawInteraction);
    },

    onAnalysisDrawEnd(evt) {
      // Clear previous highlight/source, but not before Draw finishes!
      if (this.highlightLayer) {
        this.highlightLayer.getSource().clear();
      }
      const feature = evt.feature;
      // Convert to WGS84 and build GeoJSON
      const geom = feature.getGeometry().clone();
      geom.transform('EPSG:3857', 'EPSG:4326');
      const geojson = new GeoJSON().writeGeometryObject(geom);
      const encoded = encodeURIComponent(JSON.stringify(geojson));
      const ts = Date.now();
      // Build URL
      let baseUrl = this.$appConfig.app.analysis.rShinyServerUrl;
      if (!baseUrl.endsWith('/')) {
        baseUrl += '/';
      }
      const url = `${baseUrl}?geojson=${encoded}&_ts=${ts}`;
      console.log('Generated Analysis URL:', url);
      // Store / open
      this.analysisIframeUrl = url;
      // Highlight (use clone to avoid same instance)
      if (this.highlightLayer) {
        this.highlightLayer.getSource().addFeature(feature.clone());
      }

      // Optional: stop drawing
      this.map.removeInteraction(this.analysisDrawInteraction);
      this.analysisDrawInteraction = null;

      if (this.$vuetify.breakpoint.smAndDown) {
        this.mobilePanelState = true;
      }
    },

    zoomToFeature(feature) {
      const geometry = feature.getGeometry();
      if (!geometry) return;
      const extent = geometry.getExtent();
      const padding = 0.1;
      const width = extent[2] - extent[0];
      const height = extent[3] - extent[1];
      const paddedExtent = [
        extent[0] - width * padding,
        extent[1] - height * padding,
        extent[2] + width * padding,
        extent[3] + height * padding,
      ];
      this.map.getView().fit(paddedExtent, {
        duration: 500,
        padding: [20, 20, 20, 20],
      });
    },

    ...mapMutations('map', {
      toggleSnackbar: 'TOGGLE_SNACKBAR',
    }),
  },
  watch: {
    isEditingLayer(newValue) {
      // Close analysis when editing is enabled
      if (newValue && this.analysisEditType) {
        this.stopAnalysis();
      }
    },
  },
  beforeDestroy() {
    this.stopAnalysis();
  },
};
</script>

<style lang="css" scoped>
.analysis-control {
  z-index: 1;
}
</style>
