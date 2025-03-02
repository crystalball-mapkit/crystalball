<template>
  <div
    v-if="!$vuetify.breakpoint.smAndDown && !!timeSeriesLayer && timeSeriesLayer.getVisible()"
    :style="`position:absolute;left:calc(50% + 112px);transform:translateX(-50%);bottom:80px;opacity:90%;z-index:1;minWidth:350px;width:calc(75% - 225px);`"
  >
    <v-card class="mx-auto py-1 mx-4">
      <!-- Current Layer Name -->
      <v-row class="my-1" justify="center">
        <span class="black--text text--darken-2 subtitle-2 font-weight-bold">
          {{ getSeriesActiveLayerTitle(timeSeriesLayer) }}
        </span>
      </v-row>
      <v-card-text class="py-0 pb-1">
        <v-slider
          :color="color"
          :step="1"
          ticks
          :value="timeSeriesLayer.get('activeLayerIndex') ?? timeSeriesLayer.get('defaultSeriesLayerIndex') ?? 0"
          track-color="grey"
          :max="timeSeriesLayer.getLayers().getArray().length - 1"
          @change="activateTimeSeriesLayer($event, timeSeriesLayer)"
          hide-details
          center-affix
        >
          <template v-slot:prepend v-if="timeSeriesLayer.get('playButton') !== false">
            <v-btn
              v-if="!timeSeriesLayer.get('isPlayDisabled')"
              :color="color"
              style="cursor: pointer"
              class="elevation-0"
              fab
              small
              icon
              @click="isPlaying ? stop() : play()"
            >
              <v-icon>{{ isPlaying ? 'mdi-pause' : 'fas fa-play-circle' }}</v-icon>
            </v-btn>
          </template>
          <template v-slot:append>
            <v-btn
              :color="color"
              elevation="0"
              icon
              :disabled="timeSeriesLayer.get('activeLayerIndex') === 0"
              @click="previous"
            >
              <v-icon>mdi-step-backward</v-icon>
            </v-btn>
            <v-btn
              :color="color"
              elevation="0"
              icon
              @click="next"
              :disabled="timeSeriesLayer.get('activeLayerIndex') === timeSeriesLayer.getLayers().getArray().length - 1"
            >
              <v-icon>mdi-step-forward</v-icon>
            </v-btn>
          </template>
        </v-slider>
      </v-card-text>
    </v-card>
  </div>
</template>
<script>
import {mapGetters} from 'vuex';
import {mapFields} from 'vuex-map-fields';
import {Mapable} from '../../../../mixins/Mapable';

export default {
  mixins: [Mapable],
  name: 'time-slider',
  props: {
    color: {type: String, default: '#4CAF50'},
  },
  data() {
    return {
      isPlaying: false,
      playInterval: null,
    };
  },
  methods: {
    updateRows() {
      const currentRes = this.map.getView().getResolution();
      Object.keys(this.layers).forEach(key => {
        const layer = this.layers[key];
        const minRes = layer.getMinResolution();
        const maxRes = layer.getMaxResolution();
        if (currentRes >= minRes && currentRes <= maxRes) {
          layer.set('isVisibleInResolution', true);
        } else {
          layer.set('isVisibleInResolution', false);
        }
        if (this.isReady === false) {
          this.isReady = true;
        }
        this.$forceUpdate();
      });
    },
    activateTimeSeriesLayer(index, layerGroup) {
      const layers = layerGroup.getLayers().getArray();
      layers.forEach(layer => {
        layer.setVisible(false);
      });
      layers[index].setVisible(true);
      this.$nextTick(() => {
        this.updateRows();
      });
      layerGroup.set('activeLayerIndex', index);
    },
    play() {
      this.isPlaying = true;
      this.playInterval = setInterval(() => {
        if (this.timeSeriesLayer.get('activeLayerIndex') === this.timeSeriesLayer.getLayers().getArray().length - 1) {
          this.activateTimeSeriesLayer(0, this.timeSeriesLayer);
        } else {
          this.activateTimeSeriesLayer(this.timeSeriesLayer.get('activeLayerIndex') + 1, this.timeSeriesLayer);
        }
      }, this.timeSeriesLayer.get('playInterval') || 2000);
    },
    stop() {
      this.isPlaying = false;
      clearInterval(this.playInterval);
    },
    previous() {
      this.stop();
      const index = this.timeSeriesLayer.get('activeLayerIndex');
      this.activateTimeSeriesLayer(index - 1, this.timeSeriesLayer);
    },
    next() {
      this.stop();
      const index = this.timeSeriesLayer.get('activeLayerIndex');
      this.activateTimeSeriesLayer(index + 1, this.timeSeriesLayer);
    },
    getSeriesActiveLayerTitle(layerGroup) {
      const layers = layerGroup.getLayers().getArray();
      const activeLayerIndex = layerGroup.get('activeLayerIndex') || 0;
      const title =
        layers[activeLayerIndex].get('legendDisplayName') &&
        layers[activeLayerIndex].get('legendDisplayName')[this.$i18n.locale]
          ? layers[activeLayerIndex].get('legendDisplayName')[this.$i18n.locale]
          : layers[activeLayerIndex].get('name');
      return title;
    },
  },
  computed: {
    ...mapGetters('map', {
      layers: 'layers',
    }),
    ...mapFields('map', {
      lastSelectedLayer: 'lastSelectedLayer',
    }),
    timeSeriesLayer() {
      if (!this.layers) {
        return null;
      }
      if (this.lastSelectedLayer) {
        const selectedLayer = this.layers[this.lastSelectedLayer];
        if (selectedLayer && selectedLayer.get('displaySeries') && selectedLayer.get('largeSlider')) {
          return selectedLayer;
        }
      }
      for (const layer of Object.values(this.layers)) {
        if (layer.get('displaySeries') && layer.get('largeSlider')) {
          return layer;
        }
      }
      return null;
    },
  },
};
</script>
<style lang="css" scoped>
.v-input {
  align-items: center;
}
</style>
