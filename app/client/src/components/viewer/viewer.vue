<template>
  <div>
    <!-- OL MAP -->
    <div class="fullscreen">
      <app-ol-map class="fullscreen" ref="olmap"></app-ol-map>
    </div>
  </div>
</template>

<script>
import appMap from './ol/Map.vue';

export default {
  name: 'app-viewer',
  components: {
    'app-ol-map': appMap,
  },
  data() {
    return {};
  },
  methods: {},
};
</script>

