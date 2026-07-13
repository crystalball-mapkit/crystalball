<template>
  <div class="mt-4">
    <v-tooltip v-if="!isVisible" right>
      <template v-slot:activator="{on}">
        <v-btn
          v-if="!isVisible"
          class="search-button"
          v-on="on"
          fab
          dark
          x-small
          @click="isVisible = !isVisible"
          :color="color"
        >
          <v-icon medium>fas fa-search</v-icon>
        </v-btn>
      </template>
      <span>{{ $t('general.search') }}</span>
    </v-tooltip>
    <v-autocomplete
      v-if="isVisible"
      solo
      rounded
      style="z-index: 3; width: 300px"
      v-model="model"
      :items="items"
      :loading="isLoading"
      :label="`${$t(`general.search`)}...`"
      :search-input.sync="search"
      item-text="display_name"
      item-disabled="disabled"
      append-icon=""
      clear-icon="close"
      @click:clear="clearSearch"
      @change="zoomToLocation"
      autofocus
      clearable
      item-value="osm_id"
      hide-details
      hide-no-data
      no-filter
      prepend-inner-icon="search"
      return-object
      class="elevation-4"
      :menu-props="{maxHeight: 400}"
    >
      <template slot="append">
        <v-icon v-show="!search" v-on:click.stop.prevent="closeSearch" left>chevron_left</v-icon>
      </template>
      <template v-slot:item="data">
        <template v-if="data.item.header">
          <v-list-item-content>
            <v-list-item-title class="text-caption text--secondary font-weight-bold text-uppercase">
              {{ data.item.header }}
            </v-list-item-title>
          </v-list-item-content>
        </template>
        <template v-else-if="typeof data.item !== 'object'">
          <v-list-item-content v-text="data.item"></v-list-item-content>
        </template>
        <template v-else>
          <template v-if="data.item.icon">
            <img :src="data.item.icon" class="mr-3" />
          </template>
          <v-list-item-content style="z-index: 1; width: 220px">
            <v-list-item-title v-html="data.item.display_name"></v-list-item-title>
            <v-list-item-subtitle v-if="data.item.subtitle" v-html="data.item.subtitle"></v-list-item-subtitle>
          </v-list-item-content>
        </template>
      </template>
      <template slot="append-item"
        ><div class="nominatim-attribution pa-1 mt-2">
          <a href="http://www.openstreetmap.org/copyright" target="new">© OpenStreetMap contributors</a>
        </div>
      </template>
    </v-autocomplete>
  </div>
</template>
<script>
import axios from 'axios';
import {fromLonLat} from 'ol/proj';
import {boundingExtent} from 'ol/extent';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import {getSearchHighlightStyle} from '../../../../style/OlStyleDefs';
import {geojsonToFeature} from '../../../../utils/MapUtils';
import {debounce} from '../../../../utils/Helpers';

export default {
  props: {
    map: {type: Object, required: true},
    color: {type: String},
  },
  data() {
    return {
      isVisible: false,
      descriptionLimit: 30,
      entries: [],
      model: null,
      search: null,
      isLoading: false,
      highlightLayer: null,
    };
  },
  name: 'search',
  methods: {
    zoomToLocation() {
      if (!this.search || !this.model) return;
      this.highlightLayer.getSource().clear();

      if (this.model._type === 'feature') {
        const [lon, lat] = this.model._coords;
        const coord = fromLonLat([lon, lat]);
        this.highlightLayer.getSource().addFeature(new Feature(new Point(coord)));
        this.map.getView().animate({center: coord, zoom: 14, duration: 1000});
        return;
      }

      // Nominatim place
      const x1 = parseFloat(this.model.boundingbox[2]);
      const y1 = parseFloat(this.model.boundingbox[0]);
      const x2 = parseFloat(this.model.boundingbox[3]);
      const y2 = parseFloat(this.model.boundingbox[1]);
      const extent = boundingExtent([fromLonLat([x1, y1]), fromLonLat([x2, y2])]);
      const feature = new Feature(new Point(fromLonLat([parseFloat(this.model.lon), parseFloat(this.model.lat)])));
      this.highlightLayer.getSource().addFeature(feature);
      if (this.model.geojson) {
        const olFeatures = geojsonToFeature(this.model.geojson, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        });
        this.highlightLayer.getSource().addFeatures(olFeatures);
      }
      this.map.getView().fit(extent, {
        nearest: true,
        duration: 1000,
        maxZoom: 17,
        callback: () => {
          this.map.render();
        },
      });
    },
    clearSearch() {
      this.entries = [];
      this.highlightLayer.getSource().clear();
    },
    closeSearch() {
      this.clearSearch();
      this.isVisible = false;
    },
  },
  computed: {
    items() {
      const places = this.entries
        .filter(e => e._type === 'place')
        .map(entry => {
          const subtitle = [];
          if (entry.class) subtitle.push(entry.class);
          if (entry.type) subtitle.push(entry.type);
          return {...entry, subtitle: subtitle.join(' - ')};
        });

      const features = this.entries.filter(e => e._type === 'feature');

      const result = [];
      if (places.length) {
        result.push({header: 'Places', disabled: true});
        result.push(...places);
      }
      if (features.length) {
        result.push({header: 'Features', disabled: true});
        result.push(...features);
      }
      return result;
    },
  },
  watch: {
    search: debounce(function () {
      if (!this.search) {
        this.clearSearch();
        return;
      }
      if (this.isLoading) return;
      this.isLoading = true;

      const term = this.search;

      const searchableLayers = (this.$appConfig.map.layers || []).filter(
        l => l.searchableColumns && l.searchableColumns.length && l.url
      );

      const nominatimReq = axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(term)}&polygon_geojson=1&bounded=0&limit=10`
      );

      const wfsRequests = searchableLayers.map(layer => {
        // VECTORTILE layers point at a GWC/TMS tile template (no querystring); WFS
        // is served from the same GeoServer instance at a sibling `/wfs` endpoint.
        const gwcMatch = layer.url.match(/^(.*?)\/gwc\/service\/tms\/[^/]+\/([^@]+)@/);
        let base;
        let typeName;
        if (gwcMatch) {
          const [, geoserverRoot, gwcTypeName] = gwcMatch;
          base = `${geoserverRoot}/wfs`;
          typeName = gwcTypeName;
        } else {
          [base] = layer.url.split('?');
          const params = new URLSearchParams(layer.url.split('?')[1]);
          typeName = params.get('typename') || params.get('typeName');
        }
        const cql = layer.searchableColumns.map(col => `(${col} ILIKE '%${term}%')`).join(' OR ');
        return axios.get(
          `${base}?service=WFS&version=1.1.0&request=GetFeature&typename=${typeName}&outputFormat=application/json&srsname=EPSG:4326&CQL_FILTER=${encodeURIComponent(cql)}&maxFeatures=5`
        );
      });

      Promise.allSettled([nominatimReq, ...wfsRequests]).then(([nominatimResult, ...wfsResults]) => {
        const places = nominatimResult.status === 'fulfilled'
          ? nominatimResult.value.data.map(item => ({...item, _type: 'place'}))
          : [];

        const features = [];
        wfsResults.forEach((result, i) => {
          if (result.status !== 'fulfilled') return;
          const layer = searchableLayers[i];
          const layerLabel =
            typeof layer.legendDisplayName === 'object'
              ? layer.legendDisplayName[this.$i18n.locale] || layer.legendDisplayName.en || layer.name
              : layer.legendDisplayName || layer.name;
          (result.value.data.features || []).forEach(f => {
            if (!f.geometry || !f.geometry.coordinates) return;
            features.push({
              display_name: f.properties.title,
              _type: 'feature',
              _coords: f.geometry.coordinates,
              subtitle: layerLabel,
            });
          });
        });

        this.entries = [...places, ...features];
        this.isLoading = false;
      });
    }, 500),
  },
  created() {
    this.highlightLayer = new VectorLayer({
      zIndex: 100,
      source: new VectorSource(),
      style: getSearchHighlightStyle,
    });
    this.map.addLayer(this.highlightLayer);
  },
};
</script>
<style lang="scss">
.search-button {
  z-index: 1;
}
.v-autocomplete__content.v-menu__content {
  transform-origin: center top !important;
  transform: scale(0.9) !important;
}
.v-autocomplete__content {
  z-index: 1001 !important;
}
.nominatim-attribution {
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
}

.nominatim-attribution a {
  color: #fff !important;
  text-decoration: none !important;
}
.v-autocomplete__content > div {
  padding-bottom: 0px !important;
}
</style>
