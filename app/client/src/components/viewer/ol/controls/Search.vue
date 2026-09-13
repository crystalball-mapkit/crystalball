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
      item-value="_key"
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
import {fromLonLat, toLonLat} from 'ol/proj';
import {boundingExtent, getCenter} from 'ol/extent';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import {mapGetters} from 'vuex';
import {mapFields} from 'vuex-map-fields';
import {getSearchHighlightStyle} from '../../../../style/OlStyleDefs';
import {geojsonToFeature} from '../../../../utils/MapUtils';
import {debounce, getTitle, stripHtml} from '../../../../utils/Helpers';
import {EventBus} from '../../../../EventBus';

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
      searchSeq: 0,
      // The literal text that produced the current results - unlike `search`, this doesn't
      // get overwritten when v-autocomplete swaps the input display to the selected item's label.
      lastQueryTerm: null,
      // Set right before we restore `search` after a selection, so that restore doesn't
      // itself re-trigger the search watcher a debounce cycle later.
      suppressNextSearch: false,
    };
  },
  name: 'search',
  methods: {
    // Every {group, region} route whose configured layers include layerName.
    findOwningRegions(layerName) {
      const groups = this.$appConfig.map.groups || {};
      const owners = [];
      Object.keys(groups).forEach(group => {
        Object.keys(groups[group]).forEach(region => {
          if ((groups[group][region].layers || []).includes(layerName)) {
            owners.push({group, region});
          }
        });
      });
      return owners;
    },
    // WFS features carry a title in one of two shapes depending on the layer: html_posts
    // uses a flat `titleTranslations` map (see getTitle in Helpers.js); generic layers
    // (points, polygons, puntos_nft, ...) use a single `translations` object keyed by
    // locale, each holding a full property set (see htmlLayerStyle's hover logic in
    // OlStyleDefs.js for the same convention). Try both, fall back to the raw title.
    resolveFeatureTitle(properties) {
      if (properties.titleTranslations) {
        return getTitle(properties, this.$appConfig.app.defaultLanguage, this.$i18n.locale) || properties.title;
      }
      if (properties.translations) {
        try {
          const translations =
            typeof properties.translations === 'string' ? JSON.parse(properties.translations) : properties.translations;
          const localeTitle = translations[this.$i18n.locale]?.title;
          if (localeTitle) return localeTitle;
        } catch (e) {
          // Malformed translations blob - fall through to the untranslated title.
        }
      }
      return properties.title;
    },
    groupRegionLabel(group, region) {
      const groupTitle = this.$appConfig.map.groupTitles?.[group];
      const regionTitle = this.$appConfig.map.regionTitles?.[region];
      const g = typeof groupTitle === 'object' ? groupTitle[this.$i18n.locale] || groupTitle.en : groupTitle;
      const r = typeof regionTitle === 'object' ? regionTitle[this.$i18n.locale] || regionTitle.en : regionTitle;
      return [g, r].filter(Boolean).join(' / ');
    },
    // sidebarHtml.groups is keyed by `${navbarGroup}_${region}` (see store/modules/map.js groupName getter) -
    // reverse that back into the {group, region} pair it was built from.
    findGroupRoute(groupKey) {
      const groups = this.$appConfig.map.groups || {};
      for (const group of Object.keys(groups)) {
        for (const region of Object.keys(groups[group])) {
          if (`${group}_${region}` === groupKey) return {group, region};
        }
      }
      return null;
    },
    // A short excerpt of plain text around the first match, for display under the result title.
    // The subtitle renders as a single truncated line, so keep the match near the front -
    // too much lead-in text and the CSS ellipsis cuts the line off before reaching it.
    buildSnippet(text, termLower) {
      const index = text.toLowerCase().indexOf(termLower);
      if (index === -1) return text.slice(0, 100);
      const start = Math.max(0, index - 15);
      const end = Math.min(text.length, index + termLower.length + 60);
      return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
    },
    // sidebarHtml (group/layer description text) is loaded entirely client-side at startup -
    // no request needed, just a plain-text scan over what's already in the app store.
    searchSidebarHtml(termLower) {
      const results = [];
      const matches = content => {
        if (!content) return false;
        const texts = [stripHtml(content.html)];
        const translations =
          typeof content.htmlTranslations === 'string'
            ? JSON.parse(content.htmlTranslations || '{}')
            : content.htmlTranslations || {};
        Object.values(translations).forEach(t => texts.push(stripHtml(t)));
        return texts.find(t => t.toLowerCase().includes(termLower));
      };

      Object.entries(this.sidebarHtml.layers || {}).forEach(([layerName, content]) => {
        const matchedText = matches(content);
        if (!matchedText) return;
        const layerConf = (this.$appConfig.map.layers || []).find(l => l.name === layerName);
        const layerLabel =
          typeof layerConf?.legendDisplayName === 'object'
            ? layerConf.legendDisplayName[this.$i18n.locale] || layerConf.legendDisplayName.en || layerName
            : layerConf?.legendDisplayName || layerName;
        const owners = this.findOwningRegions(layerName);
        const snippet = this.buildSnippet(matchedText, termLower);
        (owners.length ? owners : [null]).forEach(owner => {
          results.push({
            display_name: layerLabel,
            subtitle:
              owner && owners.length > 1 ? `${snippet} · ${this.groupRegionLabel(owner.group, owner.region)}` : snippet,
            _type: 'sidebarHtml',
            _key: `sidebarlayer-${layerName}-${owner ? `${owner.group}-${owner.region}` : 'x'}`,
            _group: owner?.group,
            _region: owner?.region,
            _selectedLayer: layerName,
          });
        });
      });

      Object.entries(this.sidebarHtml.groups || {}).forEach(([groupKey, content]) => {
        const matchedText = matches(content);
        if (!matchedText) return;
        const route = this.findGroupRoute(groupKey);
        if (!route) return;
        results.push({
          display_name: this.groupRegionLabel(route.group, route.region) || groupKey,
          subtitle: this.buildSnippet(matchedText, termLower),
          _type: 'sidebarHtml',
          _key: `sidebargroup-${groupKey}`,
          _group: route.group,
          _region: route.region,
          _selectedLayer: null,
        });
      });

      return results;
    },
    // Every layer OL actually rendered, OL layer groups included - mirrors ShareMap.vue's
    // own findLayerByName, needed here to re-open the popup for a feature found via search.
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
    // Reconstructs the OL feature from the properties/geometry the WFS search already fetched -
    // no extra request needed. `f.geometry.coordinates` is only a flat [lon, lat] pair for
    // Points; Polygons/LineStrings nest coordinates several levels deep, so everything here
    // works off the parsed feature's geometry/extent instead of assuming a Point shape.
    buildFeatureFromModel() {
      const olFeature = geojsonToFeature(
        {type: 'Feature', geometry: this.model._geometry, properties: this.model._properties},
        {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'}
      )[0];
      if (this.model._id) olFeature.setId(`clone.${this.model._id}`);
      return olFeature;
    },
    highlightFeature() {
      this.highlightLayer.getSource().clear();
      const olFeature = this.buildFeatureFromModel();
      this.highlightLayer.getSource().addFeature(olFeature.clone());
      this.map.getView().fit(olFeature.getGeometry().getExtent(), {
        maxZoom: 14,
        duration: 1000,
        callback: () => this.map.render(),
      });

      // Open the same title/html popup a real click on this feature would show.
      const targetLayer = this.findLayerByName(this.model._layerName, this.map.getLayers().getArray());
      if (targetLayer) {
        // A previously-open popup (from an earlier search selection, or a raw map click)
        // otherwise lingers - closing it first is what makes reopening a new one reliable.
        EventBus.$emit('closePopupInfo');
        this.popup.activeLayer = targetLayer;
        this.popup.activeFeature = olFeature;
        this.popup.showInSidePanel = true;
        this.sidebarState = true;
        this.searchHighlightTarget = 'feature';
      }
    },
    zoomToLocation() {
      if (!this.search || !this.model) return;
      this.searchTerm = this.lastQueryTerm;

      // v-autocomplete swaps the visible input to the selected item's own label once
      // `model` changes - put the user's actual query back so it doesn't look like their
      // search silently turned into the result's title. Vuetify applies that swap in its
      // own watcher, a tick after ours, so $nextTick alone isn't late enough to win.
      this.suppressNextSearch = true;
      setTimeout(() => {
        this.search = this.lastQueryTerm;
      }, 0);

      if (this.model._type === 'sidebarHtml') {
        // No coordinates to fly to - this is page-level description text, not a mapped
        // feature. Navigate to the owning page (if needed) and open the sidebar on it,
        // the same way `?selectedLayer=` deep links already do (see ShareMap.vue).
        const {_group: targetGroup, _region: targetRegion, _selectedLayer: selectedLayer} = this.model;
        const applyState = () => {
          // A feature popup (if one's open) takes over this same panel and hides the
          // group/layer text entirely (see isFeatureGetInfo) - close it first so the page
          // we're navigating to is actually visible.
          EventBus.$emit('closePopupInfo');
          this.lastSelectedLayer = selectedLayer || null;
          this.sidebarState = true;
          this.searchHighlightTarget = 'sidebarHtml';
        };
        const needsNavigation =
          targetGroup &&
          targetRegion &&
          (targetGroup !== this.activeLayerGroup?.navbarGroup || targetRegion !== this.activeLayerGroup?.region);

        if (needsNavigation) {
          // vue-router 3.0.1 (pinned in package.json) predates promise-returning push() -
          // it returns undefined here, so an unconditional .catch() throws.
          const nav = this.$router.push({path: `/${targetGroup}/${targetRegion}`});
          if (nav && nav.catch) nav.catch(() => {});
          EventBus.$once('group-changed', applyState);
          return;
        }
        applyState();
        return;
      }

      if (this.model._type === 'feature') {
        const {_group: targetGroup, _region: targetRegion} = this.model;
        const needsNavigation =
          targetGroup &&
          targetRegion &&
          (targetGroup !== this.activeLayerGroup?.navbarGroup || targetRegion !== this.activeLayerGroup?.region);

        if (needsNavigation) {
          // ShareMap.vue's own $route watcher re-applies ?center=&zoom= on every navigation;
          // a bare path push drops those params, so it races to recapture a stale position
          // and can snap the view away right after we zoom. Feed it the right answer instead
          // (same "lat,lon" format ShareMap itself writes) so there's nothing to race. The
          // geometry's own extent center works for any geometry type, not just Points.
          const [lon, lat] = toLonLat(getCenter(this.buildFeatureFromModel().getGeometry().getExtent()));
          // vue-router 3.0.1 (pinned in package.json) predates promise-returning push() -
          // it returns undefined here, so an unconditional .catch() throws.
          const nav = this.$router.push({
            path: `/${targetGroup}/${targetRegion}`,
            query: {center: `${lat.toFixed(3)},${lon.toFixed(3)}`, zoom: '14.000'},
          });
          if (nav && nav.catch) nav.catch(() => {});
          // Map.vue rebuilds the layer stack asynchronously after the route change;
          // it signals completion with this event.
          EventBus.$once('group-changed', () => this.highlightFeature());
          return;
        }
        this.highlightFeature();
        return;
      }

      this.highlightLayer.getSource().clear();
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
      this.searchTerm = '';
      this.searchHighlightTarget = null;
      this.highlightLayer.getSource().clear();
    },
    closeSearch() {
      this.clearSearch();
      this.isVisible = false;
    },
  },
  computed: {
    ...mapGetters('map', {
      activeLayerGroup: 'activeLayerGroup',
    }),
    ...mapGetters('app', {
      sidebarHtml: 'sidebarHtml',
    }),
    ...mapFields('app', {
      sidebarState: 'sidebarState',
    }),
    ...mapFields('map', {
      lastSelectedLayer: 'lastSelectedLayer',
      searchTerm: 'searchTerm',
      searchHighlightTarget: 'searchHighlightTarget',
      popup: 'popup',
    }),
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
      const pages = this.entries.filter(e => e._type === 'sidebarHtml');

      const result = [];
      if (places.length) {
        result.push({header: this.$t('general.places'), disabled: true});
        result.push(...places);
      }
      if (features.length) {
        result.push({header: this.$t('general.features'), disabled: true});
        result.push(...features);
      }
      if (pages.length) {
        result.push({header: this.$t('general.pages'), disabled: true});
        result.push(...pages);
      }
      return result;
    },
  },
  watch: {
    search: debounce(function () {
      if (this.suppressNextSearch) {
        this.suppressNextSearch = false;
        return;
      }
      if (!this.search) {
        this.clearSearch();
        return;
      }
      this.isLoading = true;
      this.searchSeq += 1;
      const searchId = this.searchSeq;

      const term = this.search;
      const termLower = term.toLowerCase();
      this.lastQueryTerm = term;

      const searchableLayers = (this.$appConfig.map.layers || []).filter(
        l => l.searchableColumns && l.searchableColumns.length && l.url
      );

      const nominatimReq = axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(
          term
        )}&polygon_geojson=1&bounded=0&limit=10`
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
        // Without sortBy, GeoServer returns an arbitrary slice of matches before maxFeatures
        // cuts it off - sorting by the primary searchable column makes that slice consistent
        // across requests instead of changing with every unrelated query.
        return axios.get(
          `${base}?service=WFS&version=1.1.0&request=GetFeature&typename=${typeName}&outputFormat=application/json&srsname=EPSG:4326&sortBy=${
            layer.searchableColumns[0]
          }&CQL_FILTER=${encodeURIComponent(cql)}&maxFeatures=50`
        );
      });

      Promise.allSettled([nominatimReq, ...wfsRequests]).then(([nominatimResult, ...wfsResults]) => {
        // A later keystroke may have started a newer search before this one's requests
        // settled - don't let stale results overwrite it.
        if (searchId !== this.searchSeq) return;

        const places =
          nominatimResult.status === 'fulfilled'
            ? nominatimResult.value.data.map(item => ({...item, _type: 'place', _key: `place-${item.place_id}`}))
            : [];

        const features = [];
        wfsResults.forEach((result, i) => {
          if (result.status !== 'fulfilled') return;
          const layer = searchableLayers[i];
          const layerLabel =
            typeof layer.legendDisplayName === 'object'
              ? layer.legendDisplayName[this.$i18n.locale] || layer.legendDisplayName.en || layer.name
              : layer.legendDisplayName || layer.name;
          // A layer can be configured into more than one page (group/region). Rather than
          // guessing which one the user means, list the feature once per owning page so
          // they can pick - selecting an entry navigates there if it isn't the current page.
          const owners = this.findOwningRegions(layer.name);
          const targets = owners.length ? owners : [null];
          // Rank by which searchableColumns entry matched - a hit on the first (title)
          // outranks a hit that only matched via a later column.
          const matchRank = f => {
            const index = layer.searchableColumns.findIndex(col =>
              String(f.properties[col] || '')
                .toLowerCase()
                .includes(termLower)
            );
            return index === -1 ? layer.searchableColumns.length : index;
          };
          const rankedFeatures = [...(result.value.data.features || [])].sort((a, b) => matchRank(a) - matchRank(b));
          rankedFeatures.forEach(f => {
            if (!f.geometry || !f.geometry.coordinates) return;
            // Some layers (e.g. html_posts) hold every page's posts in one shared table and
            // only ever display a given feature on the page whose navbarGroup matches its own
            // `group` property (see htmlLayerStyle in OlStyleDefs.js) - a post tagged "media"
            // never actually shows up on the "NFT" page, so don't list it there either.
            const featureTargets =
              owners.length && f.properties.group ? owners.filter(o => o.group === f.properties.group) : targets;
            featureTargets.forEach(owner => {
              features.push({
                display_name: this.resolveFeatureTitle(f.properties),
                _type: 'feature',
                _geometry: f.geometry,
                _properties: f.properties,
                _id: f.id,
                _layerName: layer.name,
                _group: owner?.group,
                _region: owner?.region,
                _key: `feature-${layer.name}-${owner ? `${owner.group}-${owner.region}` : 'x'}-${
                  f.id || JSON.stringify(f.geometry.coordinates)
                }`,
                subtitle:
                  featureTargets.length > 1
                    ? `${layerLabel} · ${this.groupRegionLabel(owner.group, owner.region)}`
                    : layerLabel,
              });
            });
          });
        });

        const pages = this.searchSidebarHtml(termLower);

        this.entries = [...places, ...features, ...pages];
        this.isLoading = false;
      });
    }, 500),
  },
  created() {
    this.highlightLayer = new VectorLayer({
      name: 'search_highlight_layer',
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
