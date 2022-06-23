<template>
  <div id="site-wrap">
    <!-- ===DESKTOP=== -->
    <v-app
      v-if="!$vuetify.breakpoint.smAndDown"
      id="wg-app"
      data-app
      :class="{ 'wg-app': true }"
    >
      <template>
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
            :style="`color:${$appConfig.app.sideBar.textColor};`"
          >
            <side-panel></side-panel>
          </v-navigation-drawer>
        </v-expand-transition>
      </template>

      <!-- APP BAR DESKTOP -->
      <v-app-bar app clipped-right height="60" :color="color.primary" dark>
        <v-toolbar-title
          @click="$appConfig.app.projectWebsite ? openWebsite() : resetMap()"
          flat
          :style="`background-color:${color.primary};text-color:white;`"
          class="logo headline font-weight-bold gray--text ml-3 dark mx-2"
          >{{ $appConfig.app.title }}</v-toolbar-title
        >
        <v-btn small depressed fab color="gray" class="ml-0" @click="goToHome()"
          ><v-icon small>fas fa-home</v-icon></v-btn
        >

        <v-spacer></v-spacer>
        <v-menu
          offset-y
          v-model="dropdownMenu"
          v-if="
            $appConfig.app.navbar && $appConfig.app.navbar.dropdownMenu === true
          "
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              text
              v-bind="attrs"
              v-on="on"
              :class="{
                active: dropdownMenu,
                'mx-2': true
              }"
            >
              {{
                `${$appConfig.map.groupTitles[activeLayerGroup.navbarGroup]}`
              }}
              <v-icon class="mx-2" left>
                expand_more
              </v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item
              :style="
                `background-color:${
                  activeLayerGroup.navbarGroup === navbarGroup.name
                    ? '#EEEEEE'
                    : ''
                };`
              "
              v-for="(navbarGroup, index) in navbarGroups"
              @click="changeNavbarGroup(navbarGroup)"
              :key="index"
            >
              <v-list-item-title>{{ navbarGroup.title }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

        <v-spacer></v-spacer>
        <template
          v-if="
            ($appConfig.app.navbar &&
              $appConfig.app.navbar.dropdownMenu !== true) ||
              !$appConfig.app.navbar
          "
        >
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
                'elevation-0':
                  activeLayerGroup.navbarGroup !== navbarGroup.name,
                'font-weight-bold black--text':
                  activeLayerGroup.navbarGroup === navbarGroup.name,
                'elevation-6': activeLayerGroup.navbarGroup === navbarGroup.name
              }"
            >
              {{ navbarGroup.title }}
            </v-btn>
          </div>
        </template>

        <v-spacer></v-spacer><v-spacer></v-spacer>

        <span class="title pr-5">before it's too late</span>
        <v-btn icon @click.stop="sidebarState = !sidebarState"
          ><v-icon medium>{{
            sidebarState ? '$close' : '$menu'
          }}</v-icon></v-btn
        >
      </v-app-bar>

      <v-content>
        <v-container style="max-height: 100%;" fluid fill-height class="pa-0">
          <app-viewer />
        </v-container>
      </v-content>
    </v-app>

    <!-- ===MOBILE=== -->
    <v-app
      data-app
      v-if="$vuetify.breakpoint.smAndDown"
      class="mobile-parent-wrap"
    >
      <!-- APP BAR MOBILE -->
      <v-app-bar :color="color.primary" height="60" absolute dark>
        <v-btn icon @click="navDrawer = !navDrawer"
          ><v-icon medium>{{ navDrawer ? '$close' : '$menu' }}</v-icon></v-btn
        >

        <v-toolbar-title>{{ title }}</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn @click="goToHome()" icon>
          <v-icon>fas fa-home</v-icon>
        </v-btn>
      </v-app-bar>

      <!-- NAVIGATION DRAWER MOBILE -->
      <v-navigation-drawer
        style="z-index:1001;"
        v-model="navDrawer"
        absolute
        left
        temporary
      >
        <v-layout justify-space-between column fill-height>
          <v-list nav dense class="mb-4">
            <!-- Main groups -->
            <v-list-item>
              <v-list-item-icon>
                <v-icon>map</v-icon>
              </v-list-item-icon>

              <v-list-item-content>
                <v-list-item-title class="font-weight-bold"
                  >MAP</v-list-item-title
                >
              </v-list-item-content>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item
              :dark="
                activeLayerGroup.navbarGroup === navbarGroup.name ? true : false
              "
              :style="
                `background-color:${
                  activeLayerGroup.navbarGroup === navbarGroup.name
                    ? color.primary
                    : 'white'
                };`
              "
              @click="changeNavbarGroup(navbarGroup)"
              v-for="(navbarGroup, index) in navbarGroups"
              :color="
                activeLayerGroup.navbarGroup === navbarGroup.name
                  ? 'white'
                  : color.primary
              "
              :key="index"
            >
              <v-list-item-title>{{
                navbarGroup.title.toUpperCase()
              }}</v-list-item-title>
            </v-list-item>
          </v-list>

          <!-- Sub groups  -->
          <v-list nav dense v-if="regionLength > 0">
            <v-list-item>
              <v-list-item-icon>
                <v-icon>subject</v-icon>
              </v-list-item-icon>

              <v-list-item-content>
                <v-list-item-title class="font-weight-bold"
                  >SUBCATEGORY</v-list-item-title
                >
              </v-list-item-content>
            </v-list-item>
            <v-divider class="mb-4"></v-divider>
            <template v-for="(region, index) in regions">
              <v-list-item
                @click="changeRegion(region)"
                v-if="hasRegion(region)"
                :dark="activeLayerGroup.region === region.name ? true : false"
                :style="
                  `background-color:${
                    activeLayerGroup.region === region.name
                      ? color.primary
                      : 'white'
                  };`
                "
                :key="index"
              >
                <v-list-item-title>{{
                  region.title.toUpperCase()
                }}</v-list-item-title>
              </v-list-item>
            </template>
          </v-list>

          <!-- Project link -->
          <v-spacer></v-spacer>
          <a
            v-if="$appConfig.app.projectWebsite"
            style="text-decoration: none;"
            class="mb-3 ml-4"
            :href="$appConfig.app.projectWebsite"
            target="_blank"
            >Project Website</a
          >
        </v-layout>
      </v-navigation-drawer>

      <app-viewer
        :style="
          `height: calc(${
            mobilePanelState ? 60 : 100
          }% - 60px);touch-action: none;`
        "
        class="mobile-map-viewer"
      ></app-viewer>

      <div class="mobile-bottom-sheet" v-show="mobilePanelState">
        <side-panel></side-panel>
        <button @click="closeAll()" class="close-btn-mobile-panel">✕</button>
      </div>
    </v-app>
  </div>
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
      postEditType: 'postEditType',
      postFeature: 'postFeature',
      popup: 'popup',
      mobilePanelState: 'mobilePanelState',
      navbarGroups: 'navbarGroups',
      appConfGroups_: 'appConfGroups_',
      regions: 'regions',
      geoserverWorkspace: 'geoserverWorkspace'
    }),
    ...mapGetters('map', {
      activeLayerGroup: 'activeLayerGroup'
    }),
    ...mapFields('app', {
      sidebarState: 'sidebarState'
    }),
    regionLength() {
      const activeNavbarGroup = this.activeLayerGroup.navbarGroup;
      const regions = this.$appConfig.map.groups[activeNavbarGroup];
      let count = 0;
      if (
        this.$appConfig.app.customNavigationScheme &&
        this.$appConfig.app.customNavigationScheme === '2'
      ) {
        const regionsArray = Object.values(this.$appConfig.map.buttons);
        regionsArray.forEach(region => {
          if (region.length > 0) {
            count++;
          }
        });
      } else {
        const regionsArray = Object.keys(regions).filter(v => v !== 'default');
        regionsArray.forEach(region => {
          if (regions[region].layers.length > 0) {
            count++;
          }
        });
      }
      return count;
    },
    title() {
      const activeNavbarGroup = this.activeLayerGroup.navbarGroup;
      const activeRegion = this.activeLayerGroup.region;
      let title = ``;
      this.navbarGroups.forEach(group => {
        if (group.name === activeNavbarGroup) {
          title = group.title.toUpperCase();
        }
      });
      this.regions.forEach(region => {
        if (region.name === activeRegion && region.name !== 'default') {
          title += ` - ${region.title}`;
        }
      });
      return title;
    }
  },
  components: {
    'app-viewer': Viewer,
    'side-panel': SidePanel
  },
  data() {
    return {
      color: this.$appConfig.app.color,
      navDrawer: false,
      sidebarWidth: {
        default: 460,
        corporateNetworkSelected: 600
      },
      dropdownMenu: false
    };
  },
  methods: {
    changeNavbarGroup(navbarGroup) {
      let region = this.activeLayerGroup.region;
      if (['3', '1'].includes(this.$appConfig.app.customNavigationScheme)) {
        region = 'default';
      }
      this.$router.push({
        path: `/${navbarGroup.name}/${region}`
      });
      if (this.$appConfig.app.customNavigationScheme === 2) {
        EventBus.$emit('noMapReset');
      } else {
        EventBus.$emit('resetMap');
      }
    },
    goToHome() {
      EventBus.$emit('resetMap');
      const groups = this.$appConfig.map.groups;
      const groupNames = Object.keys(groups);
      const defaultActiveGroup = this.$appConfig.map.defaultActiveGroup;
      const navbarGroupName =
        groupNames.indexOf(defaultActiveGroup) !== -1
          ? defaultActiveGroup
          : groupNames[0];
      let region = this.activeLayerGroup.region;
      if (['3', '1'].includes(this.$appConfig.app.customNavigationScheme)) {
        region = 'default';
      }
      this.$router.push({
        path: `/${navbarGroupName}/${region}`
      });
    },
    resetMap() {
      EventBus.$emit('resetMap');
    },
    openWebsite() {
      window.open(this.$appConfig.app.projectWebsite, '_blank');
    },
    zoomToLocation() {
      if (
        this.region === 'local' &&
        this.$appConfig.app.customNavigationScheme !== '3'
      ) {
        EventBus.$emit('zoomToLocation');
      }
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
    changeRegion(region) {
      this.$router.push({
        path: `/${this.activeLayerGroup.navbarGroup}/${region.name}`
      });
      if (
        region.name === 'local' &&
        this.$appConfig.app.customNavigationScheme !== '3'
      ) {
        EventBus.$emit('zoomToLocation');
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
    },
    closeAll() {
      EventBus.$emit('closeAll');
      this.mobilePanelState = false;
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
    let regionTitles;
    if (
      this.$appConfig.app.customNavigationScheme &&
      this.$appConfig.app.customNavigationScheme === '2'
    ) {
      regionTitles = this.$appConfig.map.buttonTitles;
    } else {
      regionTitles = this.$appConfig.map.regionTitles;
    }
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
    this.setSidebarInitialState(this.$appConfig.app.sideBar.isVisible);
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
      // Activate mobile panel state
      this.$nextTick(() => {
        this.mobilePanelState = true;
      });
    },
    postFeature(feature) {
      if (feature) {
        this.mobilePanelState = true;
      } else {
        this.mobilePanelState = false;
      }
    },
    isEditingHtml(state) {
      this.mobilePanelState = state;
    },
    isEditingPost() {
      this.mobilePanelState = false;
    },
    postEditType(state) {
      if (state === 'update') {
        this.mobilePanelState = true;
      }
    },
    'popup.activeFeature': function(feature) {
      if (feature) {
        this.mobilePanelState = true;
      } else {
        this.mobilePanelState = false;
      }
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
<style lang="scss" scoped>
.v-btn.active .v-icon {
  transform: rotate(-180deg);
}
</style>
