<template>
  <div class="mt-4">
    <v-tooltip right>
      <template v-slot:activator="{on}">
        <v-btn class="share-button" v-on="on" @click="copyLinkNow" :color="color" fab dark x-small>
          <v-icon medium>{{ copied ? 'check' : 'fas fa-share' }}</v-icon>
        </v-btn>
      </template>
      <span>{{ copied ? $t('general.copied') : $t('tooltip.shareMap') }}</span>
    </v-tooltip>
  </div>
</template>
<script>
import {toLonLat, fromLonLat} from 'ol/proj';
import {getCenter} from 'ol/extent';
import {mapFields} from 'vuex-map-fields';
import VectorTileLayer from 'ol/layer/VectorTile';
import GeoJSON from 'ol/format/GeoJSON';
import http from '../../../../services/http';
import {geojsonToFeature} from '../../../../utils/MapUtils';

export default {
  props: {
    map: {type: Object, required: true},
    color: {type: String},
  },
  data: () => ({
    copied: false,
    previousMapZoom: null,
    pendingAnalysisFeature: null,
  }),
  computed: {
    ...mapFields('app', {
      sidebarState: 'sidebarState',
    }),
    ...mapFields('map', {
      popup: 'popup',
      lastSelectedLayer: 'lastSelectedLayer',
      isSeriesPlaying: 'isSeriesPlaying',
      analysisIframeUrl: 'analysisIframeUrl',
      editLayer: 'editLayer',
      highlightLayer: 'highlightLayer',
    }),
  },
  methods: {
    createShareLink() {
      let url = window.location.href;
      url = url.split('?')[0];
      const center = this.map.getView().getCenter();
      const zoom = this.map.getView().getZoom();
      const visibleLayers = [];
      const seriesLayers = [];
      this.map
        .getLayers()
        .getArray()
        .forEach(layer => {
          if (layer.getVisible() && layer.get('displayInLegend')) {
            visibleLayers.push(layer.get('name'));
          }
          if (layer.get('displaySeries')) {
            const index = layer.get('activeLayerIndex') ?? layer.get('defaultSeriesLayerIndex') ?? 0;
            seriesLayers.push(`${layer.get('name')}:${index}`);
          }
        });
      const centerLonLat = toLonLat(center)
        .map(e => e.toFixed(3))
        .reverse();
      let link = `${url}?center=${centerLonLat.toString()}&zoom=${zoom
        .toFixed(3)
        .toString()}&layers=${visibleLayers.toString()}&sidebar=${this.sidebarState}`;
      if (seriesLayers.length) {
        link += `&series=${seriesLayers.join(',')}`;
      }
      if (this.popup && this.popup.activeFeature && this.popup.activeLayer) {
        const geom = this.popup.activeFeature.getGeometry();
        if (geom) {
          const lonLat = toLonLat(getCenter(geom.getExtent()));
          const rawId = this.popup.activeFeature.getId();
          const featureId = rawId ? String(rawId).replace(/^clone\./, '') : '';
          link += `&featureLayer=${encodeURIComponent(this.popup.activeLayer.get('name'))}`;
          if (featureId) link += `&featureId=${encodeURIComponent(featureId)}`;
          link += `&featureCoord=${lonLat[0].toFixed(5)},${lonLat[1].toFixed(5)}`;
        }
      }
      if (this.lastSelectedLayer) {
        link += `&selectedLayer=${encodeURIComponent(this.lastSelectedLayer)}`;
      }
      if (this.isSeriesPlaying) {
        link += `&playing=1`;
      }
      if (this.analysisIframeUrl) {
        link += `&analysis=${encodeURIComponent(this.analysisIframeUrl)}`;
      }
      return link;
    },
    copyLinkNow() {
      const link = this.createShareLink();
      navigator.clipboard.writeText(link);
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    },
    updateRouterQuery() {
      const center = this.map.getView().getCenter();
      const zoom = this.map.getView().getZoom().toFixed(3);
      const centerLonLat = toLonLat(center)
        .map(e => e.toFixed(3))
        .reverse();
      this.$route.meta.fromEvent = true;
      this.$router.replace({
        query: {center: centerLonLat.toString(), zoom},
      });
    },
    updateMap() {
      // Set  map center
      if (this.$route.query && this.$route.query.center) {
        const coordinate = this.$route.query.center.split(',').map(Number);
        this.map.getView().setCenter(fromLonLat(coordinate.reverse()));
      } else {
        this.updateRouterQuery();
      }
      const zoom = this.$route.query.zoom || this.previousMapZoom;
      // Set map zoom
      if (zoom) {
        this.map.getView().setZoom(parseFloat(zoom));
      }
      let queryVisibleLayers;
      if (this.$route.query && this.$route.query.layers) {
        queryVisibleLayers = this.$route.query.layers.split(',');
      }
      this.map
        .getLayers()
        .getArray()
        .forEach(layer => {
          // Turn on/off layers based on the query data if user pastes a shareable map link.
          if (Array.isArray(queryVisibleLayers) && layer.get('displayInLegend')) {
            if (queryVisibleLayers.includes(layer.get('name'))) {
              layer.setVisible(true);
            } else {
              layer.setVisible(false);
            }
          }
        });
      // Set sidebar state
      if (this.$route.query && this.$route.query.sidebar) {
        this.sidebarState = this.$route.query.sidebar != 'false';
      }
      // Restore time series active layer indices
      if (this.$route.query && this.$route.query.series) {
        const seriesMap = {};
        this.$route.query.series.split(',').forEach(item => {
          const parts = item.split(':');
          if (parts.length === 2) {
            seriesMap[parts[0]] = parseInt(parts[1], 10);
          }
        });
        this.map
          .getLayers()
          .getArray()
          .forEach(layer => {
            const name = layer.get('name');
            if (layer.get('displaySeries') && name in seriesMap) {
              const index = seriesMap[name];
              const subLayers = layer.getLayers ? layer.getLayers().getArray() : [];
              if (subLayers.length > index) {
                this.activateTimeSeriesLayer(index, layer);
              }
            }
          });
      }
      if (this.$route.query.featureLayer && this.$route.query.featureCoord) {
        this.restoreFeature(
          this.$route.query.featureLayer,
          this.$route.query.featureId || '',
          this.$route.query.featureCoord
        );
      }
      if (this.$route.query.selectedLayer) {
        this.lastSelectedLayer = this.$route.query.selectedLayer;
        this.sidebarState = true;
      }
      if (this.$route.query.playing) {
        this.isSeriesPlaying = true;
      }
      if (this.$route.query.analysis) {
        const decoded = decodeURIComponent(this.$route.query.analysis);
        const refreshed = decoded.replace(/([?&])_ts=\d+/, `$1_ts=${Date.now()}`);
        this.analysisIframeUrl = refreshed;
        this.sidebarState = true;
        const geojsonMatch = decoded.match(/[?&]geojson=([^&]+)/);
        if (geojsonMatch) {
          try {
            const geomObj = JSON.parse(decodeURIComponent(geojsonMatch[1]));
            const format = new GeoJSON();
            const feature = format.readFeature(
              {type: 'Feature', geometry: geomObj},
              {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'}
            );
            if (this.editLayer && this.highlightLayer) {
              this.editLayer.getSource().clear();
              this.editLayer.getSource().addFeature(feature.clone());
              this.highlightLayer.getSource().clear();
              this.highlightLayer.getSource().addFeature(feature.clone());
            } else {
              this.pendingAnalysisFeature = feature;
            }
          } catch (e) {
            // ignore malformed geojson
          }
        }
        const presetMatch = decoded.match(/[?&]preset=([^&]+)/);
        if (presetMatch) {
          const parts = presetMatch[1].split(':');
          if (parts.length >= 2) {
            this.restoreAnalysisPresetHighlight(parts[0], parts.slice(1).join(':'));
          }
        }
      } else {
        this.analysisIframeUrl = null;
      }
    },
    restoreAnalysisPresetHighlight(presetName, presetValue) {
      const allLayers = this.map.getLayers().getArray();
      const targetLayer = allLayers.find(l => l.get('presetLayerName') === presetName);
      if (!targetLayer) return;
      let source = targetLayer.getSource?.();
      if (!source) return;
      if (typeof source.getSource === 'function') source = source.getSource();
      if (typeof source.getFeatures !== 'function') return;
      const addHighlight = () => {
        const feature = source.getFeatures().find(f => {
          const id = f.get('row_id') || f.get('id') || f.get('gid') || f.get('ID');
          return String(id).toLowerCase() === String(presetValue).toLowerCase();
        });
        if (!feature) return false;
        if (this.editLayer) {
          this.editLayer.getSource().clear();
          this.editLayer.getSource().addFeature(feature.clone());
        }
        if (this.highlightLayer) {
          this.highlightLayer.getSource().clear();
          this.highlightLayer.getSource().addFeature(feature.clone());
        }
        return true;
      };
      if (!addHighlight()) {
        source.once('featuresloadend', addHighlight);
      }
    },
    findLayerByName(name, layers) {
      for (const layer of layers) {
        if (layer.get('name') === name) return layer;
        if (layer.getLayers) {
          const found = this.findLayerByName(name, layer.getLayers().getArray());
          if (found) return found;
        }
      }
      return null;
    },
    restoreFeature(layerName, featureId, featureCoord) {
      const targetLayer = this.findLayerByName(layerName, this.map.getLayers().getArray());
      if (!targetLayer) return;

      // MVT layers have no getFeatures() — fetch from WFS by ID instead
      if (targetLayer instanceof VectorTileLayer) {
        if (!featureId) return;
        const tileUrls = targetLayer.getSource()?.getUrls?.();
        if (!tileUrls || !tileUrls[0] || !tileUrls[0].includes('geoserver')) return;
        const match = tileUrls[0].match('tms/1.0.0/(.*)@EPSG');
        if (!Array.isArray(match) || match.length < 2) return;
        const geoserverLayerName = match[1];
        http
          .get('./geoserver/wfs', {
            params: {
              service: 'WFS',
              version: ' 2.0.0',
              request: 'GetFeature',
              outputFormat: 'application/json',
              srsName: 'EPSG:3857',
              typeNames: geoserverLayerName,
              featureId,
            },
          })
          .then(response => {
            if (!response.data.features?.length) return;
            const feature = geojsonToFeature(response.data, {})[0];
            if (!feature) return;
            feature.setId(`clone.${featureId}`);
            this.popup.activeLayer = targetLayer;
            this.popup.activeFeature = feature;
            this.popup.showInSidePanel = true;
            this.sidebarState = true;
          });
        return;
      }

      let source = targetLayer.getSource?.();
      if (!source) return;
      // Unwrap Cluster to get the underlying VectorSource
      if (typeof source.getSource === 'function') source = source.getSource();
      if (typeof source.getFeatures !== 'function') return;

      const [lon, lat] = featureCoord.split(',').map(Number);
      const coord = fromLonLat([lon, lat]);

      const activate = feature => {
        const cloned = feature.clone();
        if (featureId) cloned.setId(`clone.${featureId}`);
        this.popup.activeLayer = targetLayer;
        this.popup.activeFeature = cloned;
        this.popup.showInSidePanel = true;
        this.sidebarState = true;
      };

      const findAndActivate = () => {
        // Prefer exact ID match; fall back to closest geometry center
        let match = featureId ? source.getFeatureById(featureId) : null;
        if (!match) {
          let bestDist = Infinity;
          source.getFeatures().forEach(f => {
            const ext = f.getGeometry()?.getExtent();
            if (!ext) return;
            const dx = (ext[0] + ext[2]) / 2 - coord[0];
            const dy = (ext[1] + ext[3]) / 2 - coord[1];
            const dist = dx * dx + dy * dy;
            if (dist < bestDist) {
              bestDist = dist;
              match = f;
            }
          });
        }
        if (match) activate(match);
        return !!match;
      };

      if (!findAndActivate()) {
        source.once('featuresloadend', findAndActivate);
      }
    },
    activateTimeSeriesLayer(index, layerGroup) {
      const layers = layerGroup.getLayers().getArray();
      layers.forEach(layer => {
        layer.setVisible(false);
      });
      layers[index].setVisible(true);
      layerGroup.set('activeLayerIndex', index);
    },
  },
  watch: {
    editLayer(layer) {
      if (layer && this.pendingAnalysisFeature) {
        layer.getSource().addFeature(this.pendingAnalysisFeature.clone());
        if (this.highlightLayer) this.highlightLayer.getSource().addFeature(this.pendingAnalysisFeature.clone());
        this.pendingAnalysisFeature = null;
      }
    },
    $route(newValue, oldValue) {
      // Reset previous zoom if group is changed..
      if (newValue.path !== oldValue.path) {
        this.previousMapZoom = null;
      }
      if (newValue.meta.fromEvent === true) {
        // eslint-disable-next-line no-param-reassign
        newValue.meta.fromEvent = false;
        return;
      }
      this.updateMap();
    },
  },
  mounted() {
    if (this.map) {
      this.updateMap();
      // localhost:3001/#/two?center=41.583,-73.357&zoom=12.297&layers=data_display,regiones2,colaboradores,solar&sidebar=true
      this.map.on('moveend', () => {
        this.previousMapZoom = this.map.getView().getZoom();
        this.updateRouterQuery();
        setTimeout(() => {
          this.$route.meta.fromEvent = false;
        }, 1000);
      });
    }
  },
};
</script>

<style scoped>
.v-card__text,
.v-card__title {
  word-break: normal !important;
}
.share-button {
  z-index: 1;
}
</style>
