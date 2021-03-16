<template>
  <v-app id="wg-app" data-app :class="{ 'wg-app': true }">
    <v-expand-transition>
      <v-navigation-drawer
        v-model="sidebarState"
        :width="
          !selectedCoorpNetworkEntity
            ? sidebarWidth.default
            : sidebarWidth.corporateNetworkSelected
        "
        class="elevation-6"
        :color="$appConfig.app.sideBar.backgroundColor"
        stateless
        app
        clipped
        right
      >
        <side-panel></side-panel>
      </v-navigation-drawer>
    </v-expand-transition>

    <v-app-bar app clipped-right height="60" :color="color.primary" dark>
      <v-toolbar-title
        @click="goToHome()"
        flat
        :style="`background-color:${color.primary};text-color:white;`"
        class="logo headline font-weight-bold gray--text mr-3 dark"
        >{{ $appConfig.app.title }}</v-toolbar-title
      >
      <v-tooltip right>
        <template v-slot:activator="{ on }">
          <v-btn
            v-on="on"
            small
            depressed
            fab
            color="gray"
            class="ml-0"
            @click="openWebsite()"
            ><v-icon medium>fas fa-question</v-icon></v-btn
          > </template
        ><span>Open Website</span>
      </v-tooltip>

      <v-spacer></v-spacer>
      <div v-for="(navbarGroup, index) in navbarGroups" :key="index">
        <v-btn
          min-width="200"
          class="mx-10"
          :dark="
            activeLayerGroup.navbarGroup === navbarGroup.name ? false : true
          "
          @click="changeNavbarGroup(navbarGroup)"
          :color="
            activeLayerGroup.navbarGroup === navbarGroup.name
              ? 'white'
              : color.primary
          "
          :class="{
            'elevation-0': activeLayerGroup.navbarGroup !== navbarGroup.name,
            'font-weight-bold black--text':
              activeLayerGroup.navbarGroup === navbarGroup.name,
            'elevation-6': activeLayerGroup.navbarGroup === navbarGroup.name
          }"
        >
          {{ navbarGroup.title }}
        </v-btn>
      </div>
      <v-spacer></v-spacer><v-spacer></v-spacer>

      <!--      <span class="title pr-5">before it's too late</span>  -->
      <v-btn icon @click.stop="sidebarState = !sidebarState"
        ><v-icon medium>{{ sidebarState ? '$close' : '$menu' }}</v-icon></v-btn
      >
    </v-app-bar>

    <v-content>
      <v-container style="max-height: 100%;" fluid fill-height class="pa-0">
        <app-viewer />
      </v-container>
    </v-content>
  </v-app>
</template>

<script>
import { EventBus } from '../EventBus.js';
import Viewer from '../components/viewer/viewer';
import SidePanel from '../components/core/SidePanel';
//Store imports
import { mapMutations, mapGetters } from 'vuex';
import { mapFields } from 'vuex-map-fields';

export default {
  name: 'wg-app',
  props: ['navbarGroup', 'region'],
  computed: {
    ...mapFields('map', {
      selectedCoorpNetworkEntity: 'selectedCoorpNetworkEntity',
      isEditingPost: 'isEditingPost',
      isEditingHtml: 'isEditingHtml',
      navbarGroups: 'navbarGroups',
      regions: 'regions',
      geoserverWorkspace: 'geoserverWorkspace'
    }),
    ...mapGetters('map', {
      activeLayerGroup: 'activeLayerGroup'
    }),
    ...mapFields('app', {
      sidebarState: 'sidebarState'
    })
  },
  components: {
    'app-viewer': Viewer,
    'side-panel': SidePanel
  },
  data() {
    return {
      color: this.$appConfig.app.color,
      sidebarWidth: {
        default: 460,
        corporateNetworkSelected: 600
      }
    };
  },
  methods: {
    goToHome() {
      EventBus.$emit('resetMap');
    },
    openWebsite() {
      window.open('https://wiki.timetochange.today', '_blank');
    },
    zoomToLocation() {
      if (this.region === 'local') {
        EventBus.$emit('zoomToLocation');
      }
    },
    changeNavbarGroup(navbarGroup) {
      this.$router.push({ path: `/${navbarGroup.name}` });
      EventBus.$emit('noMapReset');
    },
    onResize() {
      const winWidth = window.innerWidth;
      let _default;
      let _corporateNetworkSelected;
      if (winWidth > 2000) {
        // Values for larger screens
        _default = 600;
        _corporateNetworkSelected = 600;
      } else if (winWidth < 900) {
        // Values for small screens (mini - tables or low resolutions)
        _default = 350;
        _corporateNetworkSelected = 350;
      } else {
        // Values for normal screens (default)
        _default = 460;
        _corporateNetworkSelected = 600;
      }
      this.sidebarWidth = {
        default: _default,
        corporateNetworkSelected: _corporateNetworkSelected
      };
    },
    ...mapMutations('map', {
      setActiveLayerGroup: 'SET_ACTIVE_LAYERGROUP'
    }),
    ...mapMutations('app', {
      setSidebarInitialState: 'setSidebarInitialState'
    })
  },
  created() {
    // Navgroups
    const groups = this.$appConfig.map.groups;
    const groupTitles = this.$appConfig.map.groupTitles;
    const navbarGroups = [];
    Object.keys(groups).forEach(groupName => {
      navbarGroups.push({
        name: groupName,
        title: groupTitles[groupName] || groupName
      });
    });
    this.navbarGroups = navbarGroups;
    // Regions
    const regionTitles = this.$appConfig.map.regionTitles;
    Object.keys(regionTitles).forEach(regionName => {
      this.regions.push({
        name: regionName,
        title: regionTitles[regionName]
      });
    });

    // Geoserver workspace
    this.geoserverWorkspace = this.$appConfig.map.geoserverWorkspace;
    // Set active layer group
    this.setActiveLayerGroup({
      navbarGroup: this.navbarGroup,
      region: this.region
    });
    // Set initial state for sidebar.
    // this.setSidebarInitialState(this.$appConfig.app.sideBar.isVisible);
  },
  watch: {
    $route(newValue, oldValue) {
      if (oldValue.path === newValue.path) {
        return;
      }
      this.setActiveLayerGroup({
        navbarGroup: this.navbarGroup,
        region: this.region
      });
      this.zoomToLocation();
    }
  },
  mounted() {
    // inform registered cmps that the app is mounted and the dynamic
    // components are available
    EventBus.$emit('app-mounted');
    this.onResize();
    window.addEventListener('resize', this.onResize, { passive: true });
  },
  beforeDestroy() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('resize', this.onResize, { passive: true });
  }
};
</script>
