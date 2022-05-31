<template>
  <div>
    <div class="region-control">
      <v-layout row>
        <div v-for="(region, index) in regions" :key="index">
          <v-btn
            v-if="hasRegion(region)"
            min-width="140"
            class="mx-2 mb-2 locate-button"
            dark
            @click="changeRegion(region)"
            :color="
              activeLayerGroup.region === region.name
                ? color.activeButton
                : color.inactiveButton
            "
            :class="{
              'elevation-6': activeLayerGroup.region === region.name
            }"
          >
            {{ region.title }}
          </v-btn>
        </div>
      </v-layout>
    </div>
  </div>
</template>
<script>
//Store imports
import { mapGetters } from 'vuex';

// import the app-wide EventBus
import { EventBus } from '../../../../EventBus';

export default {
  name: 'route-control',
  props: {
    color: { type: Object }
  },
  methods: {
    changeRegion(region) {
      this.$router.push({
        path: `/${this.activeLayerGroup.navbarGroup}/${region.name}`
      });
      if (region.name === 'local') {
        let regionResolution;
        if (this.$appConfig.app.customNavigationScheme === '3') {
          regionResolution = this.$appConfig.map.groups[
            this.activeLayerGroup.navbarGroup
          ][region.name].resolution;
        }
        EventBus.$emit('zoomToLocation', regionResolution);
      }
      if (
        region.name === 'global' &&
        this.$appConfig.app.customNavigationScheme === '3'
      ) {
        EventBus.$emit('resetMap');
      }
    },
    hasRegion(region) {
      const activeNavbarGroup = this.activeLayerGroup.navbarGroup;
      const regions = this.$appConfig.map.groups[activeNavbarGroup];
      if (region.name === 'default') {
        return;
      }
      if (
        this.$appConfig.app.customNavigationScheme &&
        this.$appConfig.app.customNavigationScheme === '2'
      ) {
        return true;
      }
      if (regions[region.name] && regions[region.name].layers.length > 0) {
        return true;
      } else {
        return false;
      }
    }
  },
  computed: {
    ...mapGetters('map', {
      activeLayerGroup: 'activeLayerGroup',
      navbarGroups: 'navbarGroups',
      regions: 'regions'
    })
  }
};
</script>
<style lang="css" scoped>
.region-control {
  position: fixed;
  right: calc(45% - 50px);
  bottom: 20px;
  z-index: 1;
}
</style>
