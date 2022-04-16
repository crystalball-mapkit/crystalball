<template>
  <div class="mt-4">
    <v-tooltip v-if="!isVisible" right>
      <template v-slot:activator="{ on }">
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
      <span>Search</span>
    </v-tooltip>
    <v-autocomplete
      v-if="isVisible"
      solo
      rounded
      style="z-index: 1;width:260px;"
      v-model="model"
      :items="items"
      :loading="isLoading"
      label="Search..."
      :search-input.sync="search"
      item-text="DisplayName"
      append-icon=""
      clear-icon="close"
      @click:clear="clearSearch"
      @change="zoomToLocation"
      clearable
      item-value="osm_id"
      hide-details
      hide-selected
      hide-no-data
      prepend-inner-icon="search"
      return-object
      class="elevation-4"
      :menu-props="{ maxHeight: 400 }"
    >
      <template slot="append">
        <v-icon v-show="!search" v-on:click.stop.prevent="closeSearch" left
          >chevron_left</v-icon
        >
      </template>
    </v-autocomplete>
  </div>
</template>
<script>
import axios from 'axios';
import { debounce } from '../../../../utils/Helpers';
import { fromLonLat } from 'ol/proj';
import { boundingExtent } from 'ol/extent';

export default {
  props: {
    map: { type: Object, required: true },
    color: { type: String }
  },
  data() {
    return {
      isVisible: false,
      descriptionLimit: 30,
      entries: [],
      model: null,
      search: null,
      isLoading: false
    };
  },
  name: 'search',
  methods: {
    zoomToLocation() {
      if (!this.search || !this.model) return;
      const x1 = parseFloat(this.model.boundingbox[2]);
      const y1 = parseFloat(this.model.boundingbox[0]);
      const x2 = parseFloat(this.model.boundingbox[3]);
      const y2 = parseFloat(this.model.boundingbox[1]);
      const extent = boundingExtent([
        fromLonLat([x1, y1]),
        fromLonLat([x2, y2])
      ]);
      this.map.getView().fit(extent, {
        nearest: true,
        duration: 1000,
        maxZoom: 18,
        callback: () => {
          this.map.render();
        }
      });
    },
    clearSearch() {
      this.entries = [];
      this.count = 0;
    },
    closeSearch() {
      this.clearSearch();
      this.isVisible = false;
    }
  },
  computed: {
    items() {
      return this.entries.map(entry => {
        const DisplayName =
          entry.display_name.length > this.descriptionLimit
            ? entry.display_name.slice(0, this.descriptionLimit) + '...'
            : entry.display_name;
        return Object.assign({}, entry, { DisplayName });
      });
    }
  },
  watch: {
    search: debounce(function() {
      // Items have already been requested
      if (this.isLoading || !this.search) return;
      this.isLoading = true;
      axios
        .get(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${this.search}&polygon_geojson=0&bounded=0&limit=10`
        )
        .then(response => {
          this.count = response.data.length;
          this.entries = response.data;
          this.isLoading = false;
        })
        .catch(() => {
          this.isLoading = false;
        });
    }, 600)
  }
};
</script>
<style lang="css">
.search-button {
  z-index: 10000;
}
.v-autocomplete__content.v-menu__content {
  transform-origin: center top !important;
  transform: scale(0.9) !important;
}
</style>
