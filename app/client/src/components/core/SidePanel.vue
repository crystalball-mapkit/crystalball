<template>
  <v-layout class=".sidebar-content" justify-space-between column fill-height>
    <template
      v-if="
        !selectedCoorpNetworkEntity &&
        !isEditingPost &&
        !isEditingHtml &&
        !editType &&
        (!highlightLayer || !highlightLayer.getSource().getFeatures().length > 0)
      "
    >
      <vue-scroll ref="vs">
        <v-row class="mx-0 px-0">
          <v-col class="mt-0 pt-0">
            <div v-if="isFeatureGetInfo">
              <v-row align="center" class="my-1 mx-1" style="word-break: break-word">
                <v-col class="mt-1 pt-0">
                  <div class="sidepanel-header">
                    <h1><span style="font-align: center; color: #c00"></span></h1>
                  </div>

                  <!-- SIDEBAR TOP MEDIA PLAYER -->
                  <template
                    v-if="
                      popup.showInSidePanel === true &&
                      popup.activeFeature &&
                      popup.activeFeature.get('sidebarMediaTop')
                    "
                  >
                    <span
                      id="sidebar-media-top"
                      v-html="renderMediaHtml(popup.activeFeature.get('sidebarMediaTop'))"
                    ></span>
                  </template>
                  <!-- (default top media url) -->
                  <template
                    v-else-if="
                      popup.showInSidePanel === true &&
                      popup.activeFeature &&
                      popup.activeLayer.get('sidebarDefaultMedia') &&
                      popup.activeLayer.get('sidebarDefaultMedia').top
                    "
                  >
                    <span
                      id="sidebar-default-media-top"
                      v-html="renderMediaHtml(popup.activeLayer.get('sidebarDefaultMedia').top)"
                    ></span>
                  </template>
                  <div
                    align="center"
                    style="display: flex; justify-content: center; align-items: center; width: 100%"
                    class="caption font-italic font-weight-medium"
                    v-if="popup.showInSidePanel === true && popup.activeFeature && popup.activeFeature.get('caption')"
                    tabindex="0"
                  >
                    <span
                      v-html="
                        translations && translations[$i18n.locale]
                          ? translations[$i18n.locale]['caption'] || popup.activeFeature.get('caption')
                          : popup.activeFeature.get('caption')
                      "
                    ></span>
                  </div>
                  <!-- HTML DISPLAY FOR GROUPS AND LAYERS -->
                  <template v-if="!popup.showInSidePanel">
                    <v-row>
                      <span class="ml-2 mt-1 subtitle" v-if="lastSelectedLayer">{{
                        layers[lastSelectedLayer].get('legendDisplayName')[$i18n.locale] ||
                        (typeof layers[lastSelectedLayer].get('legendDisplayName') === 'object' &&
                          Object.values(layers[lastSelectedLayer].get('legendDisplayName'))[0]) ||
                        layers[lastSelectedLayer].get('legendDisplayName') ||
                        lastSelectedLayer
                      }}</span>
                      <v-spacer></v-spacer>
                      <!-- EDIT SIDEBAR TEXT BUTTON -->
                      <div v-if="canEditSidebar">
                        <v-tooltip left>
                          <template v-slot:activator="{on}">
                            <v-btn v-on="on" @click="editHtml()" icon class="mr-3">
                              <v-icon>edit</v-icon>
                            </v-btn> </template
                          ><span>{{ $t('general.edit') }}</span></v-tooltip
                        >
                      </div>
                    </v-row>
                    <v-divider v-if="canEditSidebar"></v-divider>

                    <!-- CAPTION - USE BY UNCOMMENTING
              <div class="caption font-italic font-weight-medium">
                some features only appear when you zoom in
              </div>  -->
                    <!-- HEADER -->
                    <!-- <p class="mt-4" style="font-size:115%;">
                  <strong
                    ><em
                      ><span
                        v-html="visibleGroup.sidePanel.headerText"
                      ></span></em
                  ></strong>
                </p> -->
                    <!-- BODY -->
                    <!-- <p v-html="visibleGroup.sidePanel.bodyText1"></p>
                <p v-html="visibleGroup.sidePanel.bodyText2"></p> -->
                    <v-row>
                      <v-col class="html-viewer">
                        <p
                          v-if="lastSelectedLayer && sidebarHtml.layers"
                          v-html="
                            getHtml(sidebarHtml.layers[lastSelectedLayer], $appConfig.app.defaultLanguage, $i18n.locale)
                          "
                        ></p>
                        <p
                          v-else-if="sidebarHtml.groups && sidebarHtml.groups[groupName]"
                          v-html="getHtml(sidebarHtml.groups[groupName], $appConfig.app.defaultLanguage, $i18n.locale)"
                        ></p>
                      </v-col>
                    </v-row>
                  </template>

                  <!-- VISIBLE ONLY WHEN USER HAS CLICKED DIVE/SHOW ALL FEATURE -->
                  <div class="mt-4 ml-1" style="width: 100%" v-if="popup.showInSidePanel">
                    <v-divider class="mb-1"></v-divider>
                    <v-layout>
                      <v-btn
                        @click="dive"
                        text
                        small
                        class="mb-2 mt-1 mr-2"
                        v-if="
                          ['Point', 'MultiPoint'].includes(popup.activeFeature.getGeometry().getType()) &&
                          !previousMapPosition
                        "
                      >
                        <v-icon small class="mr-1">fas fa-search-plus</v-icon>
                        {{ $t('general.zoom') }}
                      </v-btn>
                      <v-btn
                        @click="back"
                        text
                        small
                        class="mb-2 mt-1 mr-2"
                        v-if="previousMapPosition && previousMapPosition.zoom && previousMapPosition.center"
                      >
                        <v-icon small class="mr-1">fas fa-arrow-left</v-icon>
                        {{ $t('general.back') }}
                      </v-btn>
                      <v-spacer></v-spacer>
                      <v-btn
                        @click="findCorporateNetwork"
                        text
                        small
                        class="mb-2 mt-1 mr-2"
                        v-if="popup.activeFeature.get('entity') && popup.activeLayer.get('includeInSearch') !== false"
                      >
                        <v-icon small class="mr-1">public</v-icon>
                        {{ searchLabel }}
                      </v-btn>
                      <v-btn v-if="!$vuetify.breakpoint.smAndDown" @click="closePopupInfo" text small class="mb-2 mt-1">
                        <v-icon small class="mr-1">close</v-icon>
                        {{ $t('general.close') }}
                      </v-btn>
                    </v-layout>

                    <v-divider class="mb-4"></v-divider>
                    <div class="body-2" v-for="item in popupInfo" :key="item.property">
                      <span
                        v-if="!hiddenProps.includes(item.property) && !['null', '---'].includes(item.value)"
                        v-html="
                          `<strong>${mapPopupPropName(
                            item,
                            popup.activeLayer,
                            translations && translations[$i18n.locale] && translations[$i18n.locale]['keys']
                          )}: </strong>` +
                          (translations && translations[$i18n.locale]
                            ? translations[$i18n.locale][item.property] || item.value
                            : item.value)
                        "
                      ></span>
                    </div>
                    <v-divider class="mt-4"></v-divider>
                  </div>
                  <!-- SIDEBAR BOTTOM MEDIA PLAYER -->
                  <!-- (feature media url) -->
                  <template
                    v-if="
                      popup.showInSidePanel === true &&
                      popup.activeFeature &&
                      popup.activeFeature.get('sidebarMediaBottom')
                    "
                  >
                    <span
                      id="sidebar-media-bottom"
                      v-html="renderMediaHtml(popup.activeFeature.get('sidebarMediaBottom'))"
                    ></span>
                  </template>
                  <!-- (default bottom media url) -->
                  <template
                    v-else-if="
                      popup.showInSidePanel === true &&
                      popup.activeFeature &&
                      popup.activeLayer.get('sidebarDefaultMedia') &&
                      popup.activeLayer.get('sidebarDefaultMedia').bottom
                    "
                  >
                    <span
                      id="sidebar-default-media-bottom"
                      v-html="renderMediaHtml(popup.activeLayer.get('sidebarDefaultMedia').bottom)"
                    ></span>
                  </template>
                </v-col>
              </v-row>
            </div>
            <!-- EDIT POST BUTTONS -->
            <div v-if="isHtmlViewer" style="width: 100%">
              <v-row>
                <v-spacer></v-spacer>
                <div v-if="canEditPost">
                  <v-tooltip left>
                    <template v-slot:activator="{on}">
                      <v-btn v-on="on" @click="deletePost(popup.activeFeature)" icon class="mr-3">
                        <v-icon>delete</v-icon>
                      </v-btn> </template
                    ><span>{{ $t('form.htmlPostEditor.deletePost') }}</span>
                  </v-tooltip>
                  <v-tooltip left>
                    <template v-slot:activator="{on}">
                      <v-btn v-on="on" @click="editPost(popup.activeFeature)" icon class="mr-3">
                        <v-icon>edit</v-icon>
                      </v-btn> </template
                    ><span>{{ $t('form.htmlPostEditor.editPost') }}</span></v-tooltip
                  >
                </div>
                <div v-if="!$vuetify.breakpoint.smAndDown">
                  <v-tooltip left>
                    <template v-slot:activator="{on}">
                      <v-btn v-on="on" @click="closePopupInfo" icon class="mr-3">
                        <v-icon>close</v-icon>
                      </v-btn> </template
                    ><span>{{ $t('general.close') }}</span></v-tooltip
                  >
                </div>
              </v-row>
              <v-divider v-if="canEditPost"></v-divider>

              <!-- <v-toolbar class="elevation-0">
                <v-avatar class="mr-3">
                  <v-img contain :src="popup.activeFeature.get('icon')"></v-img>
                </v-avatar>
                <v-toolbar-title class="h6">
                  {{ postIconTitle }}
                </v-toolbar-title>
                <v-spacer></v-spacer>
                <v-btn
                  v-if="loggedUser"
                  @click="deletePost(popup.activeFeature)"
                  icon
                >
                  <v-icon>delete</v-icon>
                </v-btn>
                <v-btn
                  v-if="loggedUser"
                  @click="editPost(popup.activeFeature)"
                  icon
                >
                  <v-icon>edit</v-icon>
                </v-btn>
              </v-toolbar> -->
              <div class="px-2 mt-1">
                <span
                  v-html="getHtml(popup.activeFeature.getProperties(), $appConfig.app.defaultLanguage, $i18n.locale)"
                ></span>
              </div>
            </div>
          </v-col>
        </v-row>
      </vue-scroll>
    </template>

    <!-- CORPORATE SEARCH  -->
    <v-layout style="overflow: hidden" fill-height v-if="selectedCoorpNetworkEntity">
      <v-row align="center" justify="center" class="mx-0" style="width: 100%">
        <v-layout align-center class="elevation-3 mb-1" style="width: 100%">
          <v-flex xs2 class="d-flex justify-center">
            <v-btn @click="backCorpNetwork()" text small class="ml-1">
              <v-icon small class="mr-1">fas fa-arrow-left</v-icon>
              {{ $t('general.back').toUpperCase() }}
            </v-btn>
          </v-flex>

          <v-flex
            xs8
            justify-center
            align-center
            style="border-left: 1px solid rgba(0, 0, 0, 0.12); border-right: 1px solid rgba(0, 0, 0, 0.12)"
          >
            <div class="sidepanel-header">
              <h1>
                <span style="font-align: center; color: #c00">{{ selectedCoorpNetworkEntity }}</span>
              </h1>
            </div>
          </v-flex>

          <v-flex v-if="!$vuetify.breakpoint.smAndDown" xs2 class="d-flex justify-center">
            <v-btn @click="closeCorpNetworkSelection()" dark :color="color" small class="ml-1 elevation-0">
              {{ $t('general.close').toUpperCase() }}
            </v-btn>
          </v-flex>
        </v-layout>
        <v-progress-linear
          v-show="iframeUrl && isIframeLoading === true"
          class="mt-n1"
          indeterminate
          height="5"
          :color="color"
        ></v-progress-linear>
        <vue-scroll>
          <v-container v-if="iframeUrl" style="overflow: hidden" class="pt-0 mt-0" fill-height>
            <v-row style="height: 100%" class="mr-6">
              <iframe
                @load="isIframeLoading = false"
                style="overflow: hidden; position: absolute; border: none; margin-left: 11px"
                height="95%"
                width="100%"
                :src="iframeUrl"
              >
              </iframe>
            </v-row>
          </v-container>

          <v-container class="pb-5 mb-3" v-if="!iframeUrl && popup.selectedCorpNetworkLayer">
            <div
              v-for="(feature, index) in popup.selectedCorpNetworkLayer.getSource().getFeatures()"
              :key="index"
              class="my-3"
              @mouseover="mouseOver(feature)"
              @mouseout="mouseOut()"
            >
              <div
                class="body-2 my-1"
                v-for="item in formatPopupRows(feature, popup.exludedProps)"
                :key="item.property"
              >
                <span
                  v-if="!hiddenProps.includes(item.property) && !['null', '---'].includes(item.value)"
                  v-html="`<strong>${mapPopupPropName(item, popup.activeLayer)}: </strong>` + item.value"
                ></span>
              </div>
              <v-divider></v-divider>
            </div>
          </v-container>
        </vue-scroll>
      </v-row>
    </v-layout>

    <!-- ADD OR EDIT POST-->
    <v-layout
      :style="`overflow:${$vuetify.breakpoint.smAndDown ? 'hidden' : 'unset'};`"
      v-show="(isEditingPost && postEditLayer && postEditLayer.getSource().getFeatures().length > 0) || isEditingHtml"
      fill-height
    >
      <v-row align="start" justify="center" class="mx-0" style="width: 100%">
        <v-layout align-center class="elevation-0 mb-1" style="width: 100%">
          <edit-html
            v-show="
              (isEditingPost && postEditLayer && postEditLayer.getSource().getFeatures().length > 0) || isEditingHtml
            "
          /> </v-layout
      ></v-row>
    </v-layout>

    <!-- EDIT LAYER MOBILE -->

    <v-layout
      :style="`overflow:${$vuetify.breakpoint.smAndDown ? 'hidden' : 'unset'};`"
      v-if="
        ['addFeature', 'modifyAttributes'].includes(editType) &&
        selectedLayer &&
        highlightLayer.getSource().getFeatures().length > 0 &&
        $vuetify.breakpoint.smAndDown
      "
      fill-height
    >
      <v-row align="start" justify="center" class="mx-0" style="width: 100%">
        <layer-edit-form-mobile></layer-edit-form-mobile> </v-row
    ></v-layout>
  </v-layout>
</template>

<script>
// Store imports
import {mapGetters} from 'vuex';
import {mapFields} from 'vuex-map-fields';
import UrlUtil from '../../utils/Url';
import {getHtml} from '../../utils/Helpers';
import {SharedMethods} from '../../mixins/SharedMethods';
import {EventBus} from '../../EventBus';
import {formatPopupRows, getIframeUrl} from '../../utils/Layer';
import EditHtml from './EditHtml.vue';
import LayerEditFormMobile from './LayerEditFormMobile.vue';

export default {
  mixins: [SharedMethods],
  components: {
    'edit-html': EditHtml,
    'layer-edit-form-mobile': LayerEditFormMobile,
  },
  data() {
    return {
      isIframeLoading: true,
      color: this.$appConfig.app.color.primary,
      preventSidebarScroll: false, // Add this flag
    };
  },
  created() {
    EventBus.$on('closeAll', () => {
      this.closeCorpNetworkSelection();
      this.closePopupInfo();
    });
    EventBus.$on('switchLocale', () => {
      if (this.isEditingHtml) {
        // update html if editing
        this.editHtml();
      }
      if (this.isEditingPost && this.popup.activeFeature) {
        this.editPost(this.popup.activeFeature);
      }
    });
    EventBus.$on('scrollSidePanelTop', () => {
      if (!this.preventSidebarScroll) {
        const scrollEl = this.$refs.vs;
        if (scrollEl && scrollEl.scrollTo) {
          scrollEl.scrollTo({y: 0}, 100, 'easeInQuad');
        }
      }
    });
  },
  mounted() {
    document.addEventListener(
      'click',
      e => {
        if (e.target.closest('.map-link')) {
          // Update the flag instead of preventing the default action
          this.preventSidebarScroll = true;
          // Reset the flag after a short delay to allow for normal operations afterwards
          setTimeout(() => {
            this.preventSidebarScroll = false;
          }, 100); // Adjust the timeout as needed based on your application's behavior
        }
      },
      false
    );
  },
  computed: {
    isFeatureGetInfo() {
      if (!this.popup.activeFeature) {
        return true;
      }
      if (
        this.getHtml(this.popup.activeFeature.getProperties(), this.$appConfig.app.defaultLanguage, this.$i18n.locale)
      ) {
        return false;
      }
      return true;
    },
    isHtmlViewer() {
      // Move scroll to top.
      const scrollEl = this.$refs.vs;
      if (scrollEl && scrollEl.scrollTo) {
        scrollEl.scrollTo(
          {
            y: 0,
          },
          100,
          'easeInQuad'
        );
      }
      if (
        this.popup.activeFeature &&
        this.getHtml(this.popup.activeFeature.getProperties(), this.$appConfig.app.defaultLanguage, this.$i18n.locale)
      ) {
        return true;
      }
      return false;
    },
    iframeUrl() {
      return getIframeUrl(
        this.splittedEntities,
        this.$appConfig.map.corporateEntitiesUrls,
        this.selectedCoorpNetworkEntity
      );
    },
    hiddenProps() {
      const hiddenProps = this.$appConfig.map.featureInfoHiddenProps;
      return hiddenProps || [];
    },
    searchLabel() {
      const searchLabel = this.popup.activeLayer.get('searchLabel');
      if (searchLabel) {
        return searchLabel;
      }
      if (this.visibleGroup.searchLabel) {
        return this.visibleGroup.searchLabel.toUpperCase();
      }
      return this.$t('form.htmlPostEditor.corporateNetwork').toUpperCase();
    },
    canEditPost() {
      if (!this.loggedUser) {
        return false;
      }
      // Can edit all posts
      if (this.loggedUser.roles.includes('admin_user')) {
        return true;
      }
      // Can edit only posts created from logged user
      if (this.popup.activeFeature.get('createdBy') === this.loggedUser.user.userID) {
        return true;
      }
      return false;
    },
    canEditSidebar() {
      if (this.loggedUser && ['admin_user', 'regular_user'].some(i => this.loggedUser.roles.includes(i))) {
        return true;
      }
      return false;
    },
    ...mapGetters('map', {
      map: 'map',
      activeLayerGroup: 'activeLayerGroup',
      popupInfo: 'popupInfo',
      translations: 'translations',
      splittedEntities: 'splittedEntities',
      isEditingLayer: 'isEditingLayer',
      isEditingPost: 'isEditingPost',
      isEditingHtml: 'isEditingHtml',
      postEditLayer: 'postEditLayer',
      postIconTitle: 'postIconTitle',
      groupName: 'groupName',
      editLayer: 'editLayer',
      highlightLayer: 'highlightLayer',
      visibleGroup: 'visibleGroup',
    }),
    ...mapGetters('app', {
      sidebarHtml: 'sidebarHtml',
      postIcons: 'postIcons',
    }),
    ...mapFields('map', {
      previousMapPosition: 'previousMapPosition',
      previousMapPositionSearch: 'previousMapPositionSearch',
      isEditingHtml: 'isEditingHtml',
      popup: 'popup',
      selectedCoorpNetworkEntity: 'selectedCoorpNetworkEntity',
      lastSelectedLayer: 'lastSelectedLayer',
      layers: 'layers',
      editType: 'editType',
      selectedLayer: 'selectedLayer',
    }),
    ...mapGetters('auth', {
      loggedUser: 'loggedUser',
    }),
  },
  methods: {
    formatPopupRows,
    getHtml,
    parseUrl(url) {
      return UrlUtil.parseUrl(url);
    },
    deletePost(postFeature) {
      EventBus.$emit('deletePost', postFeature);
    },
    editPost(postFeature) {
      EventBus.$emit('editPost', postFeature);
    },
    editHtml() {
      let html = '';
      if (this.lastSelectedLayer && this.sidebarHtml.layers) {
        html = this.getHtml(
          this.sidebarHtml.layers[this.lastSelectedLayer],
          this.$appConfig.app.defaultLanguage,
          this.$i18n.locale
        );
      } else {
        html = this.getHtml(
          this.sidebarHtml.groups[this.groupName],
          this.$appConfig.app.defaultLanguage,
          this.$i18n.locale
        );
      }
      EventBus.$emit('editHtml', html);
    },
    renderMediaHtml(url) {
      const videoPossibilities = ['youtube-nocookie.com', 'youtube.com', 'vimeo.com'];
      let html = '';
      if (videoPossibilities.some(v => url.includes(v)) && !url.includes('iframe')) {
        // Render as video
        html = `<iframe
                      height="300"
                      width="100%"
                      src="${url}"
                      frameborder="0"
                      allowfullscreen
                    ></iframe>`;
      } else if (url.includes('iframe')) {
        // Render as iframe
        html = url;
      } else {
        // Render as image.
        html = `<img
                    class="my-3"
                    style="max-width:100%;"
                    src="${url}"
                  >
                  </img>`;
      }

      return html;
    },
    closePopupInfo() {
      EventBus.$emit('closePopupInfo');
      this.popup.highlightLayer.getSource().clear();
      this.popup.selectedCorpNetworkLayer.getSource().clear();
      this.popup.worldExtentLayer.getSource().clear();
    },
    findCorporateNetwork() {
      const center = this.map.getView().getCenter();
      const zoom = this.map.getView().getZoom();
      this.previousMapPositionSearch = {
        center,
        zoom,
      };
      EventBus.$emit('findCorporateNetwork');
    },
    closeCorpNetworkSelection() {
      this.closePopupInfo();
      this.selectedCoorpNetworkEntity = null;
      this.isIframeLoading = true;
      this.previousMapPosition = null;
      this.previousMapPositionSearch = null;
    },
    backCorpNetwork() {
      this.backCorpSearch();
      setTimeout(() => {
        this.closeCorpNetworkSelection();
      }, 800);
    },
    mouseOver(feature) {
      this.popup.highlightLayer.getSource().clear();
      const clonedFeature = feature.clone();
      clonedFeature.setStyle(null);
      this.popup.highlightLayer.getSource().addFeature(clonedFeature);
    },
    mouseOut() {
      this.popup.highlightLayer.getSource().clear();
    },
    storeMapPosition() {},
    dive() {
      let center = this.map.getView().getCenter();
      const zoom = this.map.getView().getZoom();
      this.previousMapPosition = {
        center,
        zoom,
      };
      const geomType = this.popup.activeFeature.getGeometry().getType();
      if (['Point', 'MultiPoint'].includes(geomType)) {
        center =
          geomType == 'Point'
            ? this.popup.activeFeature.getGeometry().getCoordinates()
            : this.popup.activeFeature.getGeometry().getFirstCoordinate();
        this.map.getView().animate({
          center,
          zoom: 13,
          duration: 800,
        });
      }
      setTimeout(() => {
        EventBus.$emit('diveToFeatureEnd');
      }, 900);
    },

    back() {
      const {zoom, center} = this.previousMapPosition;
      if (zoom && center) {
        this.map.getView().animate({
          center,
          zoom,
          duration: 800,
        });
      }
      this.previousMapPosition = null;
    },
    backCorpSearch() {
      const {zoom, center} = this.previousMapPositionSearch;
      if (zoom && center) {
        this.map.getView().animate({
          center,
          zoom,
          duration: 800,
        });
      }
      this.previousMapPositionSearch = null;
    },
  },
  watch: {
    $route(newValue, oldValue) {
      if (oldValue.path === newValue.path) {
        return;
      }
      this.previousMapPosition = null;
      this.previousMapPositionSearch = null;
    },
    'popup.activeFeature': function (feature) {
      if (feature) {
        this.$nextTick(() => {
          const elementIds = [
            'sidebar-media-top',
            'sidebar-media-bottom',
            'sidebar-default-media-top',
            'sidebar-default-media-bottom',
          ];
          elementIds.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element && element.firstChild && element.firstChild.tagName == 'IFRAME') {
              element.firstChild.width = '100%';
              this.$nextTick(() => {
                const width = element.offsetWidth;
                if (width > 0) {
                  // Workaround to make the facebook iframe responsive.
                  if (
                    element.firstChild &&
                    element.firstChild.src &&
                    element.firstChild.src.includes('facebook') &&
                    // Fb allows only width between 180 and 500.
                    width > 180 &&
                    width < 500
                  ) {
                    const updatedFbUrl = UrlUtil.updateQueryStringParameter(element.firstChild.src, 'width', width);
                    if (updatedFbUrl) {
                      element.firstChild.src = updatedFbUrl;
                    }
                  }
                }
              });
            }
          });
        });
      }
    },
  },
};
</script>

<style lang="css" scoped>
.sidepanel-header {
  width: 100%;
  text-align: center;
}

.col >>> img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  overflow: hidden;
}

.sidebar-content >>> h1 {
  font-size: 2em;
  margin-block-start: 0.67em;
  margin-block-end: 0.67em;
}

.html-viewer >>> p:empty::before {
  content: '';
  display: inline-block;
}
</style>
