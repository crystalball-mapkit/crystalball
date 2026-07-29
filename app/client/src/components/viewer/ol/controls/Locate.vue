<template>
  <div class="mt-4">
    <v-tooltip right>
      <template v-slot:activator="{on}">
        <v-btn class="locate-button" v-on="on" fab dark x-small :color="color" @click="toggleLocate()">
          <v-icon medium>fas fa-location-arrow</v-icon>
        </v-btn>
      </template>
      <span>{{ $t('tooltip.locateMe') }}</span>
    </v-tooltip>
    <confirm-location ref="confirm" :color="color"></confirm-location>
  </div>
</template>
<script>
import {circular} from 'ol/geom/Polygon';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import {fromLonLat} from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import OlStyle from 'ol/style/Style';
import OlFill from 'ol/style/Fill';
import OlStroke from 'ol/style/Stroke';
import OlCircleStyle from 'ol/style/Circle';

import ConfirmDialog from '../../../core/ConfirmDialog.vue';

// import the app-wide EventBus
import {EventBus} from '../../../../EventBus';

// Solid dot with a white halo for the exact position, soft translucent fill
// for the accuracy radius behind it -- the standard "blue dot" look.
const USER_LOCATION_COLOR = '#1a73e8';
const userLocationStyle = feature => {
  if (feature.getGeometry().getType() === 'Point') {
    return new OlStyle({
      image: new OlCircleStyle({
        radius: 7,
        fill: new OlFill({color: USER_LOCATION_COLOR}),
        stroke: new OlStroke({color: '#ffffff', width: 2}),
      }),
    });
  }
  return new OlStyle({
    fill: new OlFill({color: 'rgba(26, 115, 232, 0.15)'}),
    stroke: new OlStroke({color: 'rgba(26, 115, 232, 0.4)', width: 1}),
  });
};

export default {
  props: {
    map: {type: Object, required: true},
    color: {type: String},
  },
  components: {
    'confirm-location': ConfirmDialog,
  },
  data() {
    return {
      userLocSource: null,
      watchId: null,
      isTracking: false,
      hasZoomedToLocation: false,
    };
  },
  name: 'locate',
  methods: {
    /**
     * Bound to the button's own click only. This is the sole entry point
     * that toggles tracking off -- other callers (EventBus 'zoomToLocation',
     * used by route planning / search / initial map load) go through
     * handleZoomToMe instead, which always (re)starts tracking rather than
     * risking silently switching an already-active dot off from elsewhere
     * in the app.
     */
    toggleLocate() {
      if (this.isTracking) {
        this.stopTracking();
        return;
      }
      this.handleZoomToMe();
    },
    /**
     * Zoom to my location. Utilizes a function getLocateArgs
     * that is curried with an object containing map, source, and handler
     * passed through from the scope of this object into the event handler
     * scope, whose "this" scope is the event and the clicked button.
     *
     */
    handleZoomToMe(resolution) {
      if (!this.userLocSource) {
        this.createUserLocationLayer();
      }
      // Trigger the modal requesting zoom-to-location.
      if (!this.$cookies.get('locationRequested')) {
        this.$refs.confirm
          .open(
            this.$t('form.locateMe.zoomToLocation'),
            '',
            this.$t('form.locateMe.shareMyLocation'),
            this.$t('general.cancel'),
            {
              color: this.color,
            }
          )
          .then(confirm => {
            if (confirm) {
              this.startTracking(resolution);
              this.$cookies.set('locationRequested', true, '7d');
            }
          });
      }
      if (this.$cookies.get('locationRequested')) {
        this.startTracking(resolution);
      }
    },
    /*
     * Starts (or, if already tracking, leaves alone) a live geolocation
     * watch. Unlike the old one-shot version, this keeps running and keeps
     * the dot on the map -- it only auto-fits the view on the first fix, so
     * later position updates move the dot without fighting the user's own
     * pan/zoom.
     */
    startTracking(resolution) {
      if (this.isTracking) {
        return;
      }
      this.isTracking = true;
      this.hasZoomedToLocation = false;
      this.watchId = navigator.geolocation.watchPosition(
        pos => {
          const coords = [pos.coords.longitude, pos.coords.latitude];
          const accuracy = circular(coords, pos.coords.accuracy);
          this.userLocSource.clear(true);
          this.userLocSource.addFeatures([
            new Feature(accuracy.transform('EPSG:4326', this.map.getView().getProjection())),
            new Feature(new Point(fromLonLat(coords))),
          ]);
          if (!this.hasZoomedToLocation && !this.userLocSource.isEmpty()) {
            this.map.getView().fit(this.userLocSource.getExtent(), {
              maxZoom: 18,
              minResolution: resolution || 0,
            });
            this.hasZoomedToLocation = true;
          }
        },
        error => {
          alert(`ERROR: ${error.message}`);
          this.stopTracking();
        },
        {
          enableHighAccuracy: true,
        }
      );
    },
    /*
     * Stops the geolocation watch and removes the dot from the map.
     */
    stopTracking() {
      if (this.watchId !== null) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }
      this.isTracking = false;
      if (this.userLocSource) {
        this.userLocSource.clear(true);
      }
    },
    /*
     * Creates a new layer for the user's location that will be used for getting
     * the user's location.
     *
     * @param {Object} map: this vueJS map object
     * @return {VectorSource}: The created user layer VectorSource
     */
    createUserLocationLayer() {
      const source = new VectorSource();
      const layer = new VectorLayer({
        source,
        style: userLocationStyle,
        // Deliberately above every other layer's zIndex in app-conf.json
        // (highest currently in use is 1002) so the dot never gets painted
        // over by opaque imagery/data layers active at a given zoom --
        // without this it defaults to 0, a tie it can lose depending on
        // internal layer order.
        zIndex: 2000,
      });
      this.map.addLayer(layer);
      this.userLocSource = source;
    },
  },
  mounted() {
    EventBus.$on('zoomToLocation', this.handleZoomToMe);
  },
  beforeDestroy() {
    this.stopTracking();
    EventBus.$off('zoomToLocation', this.handleZoomToMe);
  },
};
</script>
<style lang="css" scoped>
.locate-button {
  z-index: 1;
}
</style>
