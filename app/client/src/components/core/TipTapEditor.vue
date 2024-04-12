<template>
  <div>
    <media-dialog ref="mediadialog" @onConfirm="addCommand" />

    <tip-tap-expansion-dialog ref="tiptap-expansion-dialog" @onConfirm="addCommand"></tip-tap-expansion-dialog>

    <tiptap-vuetify
      ref="tiptap"
      style="line-height: 1.2"
      class="custom-style"
      :card-props="{flat: true}"
      v-model="htmlContent"
      :placeholder="$t(`form.htmlPostEditor.placeholder`)"
      :extensions="extensions"
      :native-extensions="nativeExtensions"
      @init="onInit"
    >
      <template #toolbar-after class="pb-2">
        <div style="background-color: #f5f5f5">
          <!-- Align -->
          <template>
            <v-tooltip top>
              <template v-slot:activator="{on}">
                <v-btn
                  v-on="on"
                  :class="{
                    'ml-4': true,
                    'tiptap-vuetify-editor__action-render-btn': true,
                    'v-btn--active': editor.getMarkAttrs('align').textAlign === 'left',
                  }"
                  @click="editor.commands.align({textAlign: 'left'})"
                  small
                  icon
                >
                  <v-icon medium>format_align_left</v-icon>
                </v-btn>
              </template>
              {{ $t(`form.htmlPostEditor.alignLeft`) }}
            </v-tooltip>
            <v-tooltip top>
              <template v-slot:activator="{on}">
                <v-btn
                  v-on="on"
                  :class="{
                    'tiptap-vuetify-editor__action-render-btn': true,
                    'v-btn--active': editor.getMarkAttrs('align').textAlign === 'center',
                  }"
                  @click="editor.commands.align({textAlign: 'center'})"
                  small
                  icon
                >
                  <v-icon>format_align_center</v-icon>
                </v-btn>
              </template>
              {{ $t(`form.htmlPostEditor.alignCenter`) }}
            </v-tooltip>
            <v-tooltip top>
              <template v-slot:activator="{on}">
                <v-btn
                  v-on="on"
                  :class="{
                    'tiptap-vuetify-editor__action-render-btn': true,
                    'v-btn--active': editor.getMarkAttrs('align').textAlign === 'right',
                  }"
                  @click="editor.commands.align({textAlign: 'right'})"
                  small
                  icon
                >
                  <v-icon>format_align_right</v-icon>
                </v-btn>
              </template>
              {{ $t(`form.htmlPostEditor.alignRight`) }}
            </v-tooltip>
            <v-tooltip top>
              <template v-slot:activator="{on}">
                <v-btn
                  v-on="on"
                  :class="{
                    'tiptap-vuetify-editor__action-render-btn': true,
                  }"
                  @click="editor.commands.hard_break()"
                  small
                  icon
                >
                  <v-icon>fas fa-paragraph</v-icon>
                </v-btn>
              </template>
              {{ $t(`form.htmlPostEditor.hardBreak`) }}
            </v-tooltip>
          </template>
          <span class="mx-3" style="border-right: 1px solid grey"></span>
          <!--You can render the buttons as you wish (you can see in the source code how this is done).-->
          <v-tooltip top>
            <template v-slot:activator="{on}">
              <v-btn
                v-on="on"
                :class="{
                  'tiptap-vuetify-editor__action-render-btn': true,
                }"
                @click="openModal('image')"
                small
                icon
              >
                <v-icon>image</v-icon>
              </v-btn>
            </template>
            <span>{{ $t(`form.htmlPostEditor.addImage`) }}</span>
          </v-tooltip>

          <v-tooltip top>
            <template v-slot:activator="{on}">
              <v-btn
                v-on="on"
                :class="{
                  'tiptap-vuetify-editor__action-render-btn': true,
                }"
                small
                icon
                @click="openModal('iframe')"
              >
                <v-icon>video_library</v-icon>
              </v-btn>
            </template>
            <span>{{ $t(`form.htmlPostEditor.addVideo`) }}</span>
          </v-tooltip>
          <v-tooltip top>
            <template v-slot:activator="{on}">
              <v-btn
                v-on="on"
                :class="{
                  'tiptap-vuetify-editor__action-render-btn': true,
                }"
                small
                icon
                @click="openModal('audio')"
              >
                <v-icon>music_video</v-icon>
              </v-btn>
            </template>
            {{ $t(`form.htmlPostEditor.addAudio`) }}
          </v-tooltip>
          <v-tooltip top>
            <template v-slot:activator="{on}">
              <v-btn
                v-on="on"
                :class="{
                  'tiptap-vuetify-editor__action-render-btn': true,
                }"
                small
                icon
                @click="openModal('expansion')"
              >
                <v-icon>playlist_add</v-icon>
              </v-btn>
            </template>
            {{ $t(`form.htmlPostEditor.addExpansionPanel`) }}
          </v-tooltip>
          <v-tooltip top>
            <template v-slot:activator="{on}">
              <v-btn
                v-on="on"
                :class="{
                  'tiptap-vuetify-editor__action-render-btn': true,
                }"
                small
                icon
                @click="addMapViewLink"
              >
                <v-icon>pin_drop</v-icon>
              </v-btn>
            </template>
            {{ $t(`form.htmlPostEditor.addMapViewLink`) }}
          </v-tooltip>
          <span class="mx-3" style="border-right: 1px solid grey"></span>
          <v-tooltip top>
            <template v-slot:activator="{on}">
              <v-btn
                v-if="serverConfig && serverConfig.isTranslationEnabled"
                v-on="on"
                :class="{
                  'tiptap-vuetify-editor__action-render-btn': true,
                }"
                small
                icon
                @click="translateHtmlContent"
              >
                <v-icon>translate</v-icon>
              </v-btn>
            </template>
            {{ $t(`form.htmlPostEditor.translateContent`) + ` ${currentLanguage.value}` }}
          </v-tooltip>
        </div>
      </template>
    </tiptap-vuetify>
  </div>
  <!-- Use the component in the right place of the template -->
</template>

<script>
import {mapFields} from 'vuex-map-fields';
import {mapGetters} from 'vuex';
import {toLonLat} from 'ol/proj';
import axios from 'axios';

import {
  TiptapVuetify,
  Heading,
  Bold,
  Italic,
  Strike,
  Underline,
  BulletList,
  OrderedList,
  // Image,
  ListItem,
  Link,
  Blockquote,
  HardBreak,
  HorizontalRule,
  History,
} from 'tiptap-vuetify';
import Iframe from './TipTapIframe';
import Audio from './TipTapAudio';
import Image from './TipTapImage';
import Expansion from './TipTapExpansion';
import MapView from './TipTapMapView';
import Align from './TipTapAlign';

import MediaDialog from './TipTapMediaDialog.vue';
import TipTapExpansionDialog from './TipTapExpansionDialog.vue';
// import the component and the necessary extensions
import authHeader from '../../services/auth-header';

export default {
  // specify TiptapVuetify component in "components"
  components: {TiptapVuetify, MediaDialog, TipTapExpansionDialog},
  props: {
    map: {type: Object},
  },
  data: () => ({
    editor: null,
    // declare extensions you want to use
    extensions: [
      History,
      Blockquote,
      Link,
      Underline,
      Strike,
      Italic,
      ListItem,
      BulletList,
      OrderedList,
      [
        Heading,
        {
          options: {
            levels: [1, 2, 3],
          },
        },
      ],
      Bold,
      HorizontalRule,
      HardBreak,
    ],
    nativeExtensions: [new Iframe(), new Audio(), new Image(), new Expansion(), new MapView(), new Align()],
    languageCodes: {
      en: 'English',
      de: 'Deutsch',
      fr: 'Français',
      es: 'Español',
      pt: 'Português',
      ru: 'Русский',
      ar: 'العربية',
      zh: '中文',
    },
  }),
  computed: {
    ...mapFields('map', {
      htmlContent: 'htmlContent',
    }),
    ...mapGetters('app', {
      serverConfig: 'serverConfig',
    }),
    currentLanguage() {
      let countryCode = this.$i18n.locale;
      if (countryCode.includes('-')) {
        countryCode = countryCode.split('-')[0];
      }
      return {
        code: countryCode,
        value: this.languageCodes[countryCode] || 'English',
      };
    },
  },
  methods: {
    openModal(command) {
      if (this.editor) {
        if (command === 'expansion') {
          this.$refs['tiptap-expansion-dialog'].showModal(this.editor.commands[command], command);
        } else {
          this.$refs.mediadialog.showModal(this.editor.commands[command], command);
        }
      }
    },
    addMapViewLink() {
      let url = window.location.hash;
      // eslint-disable-next-line prefer-destructuring
      url = url.split('?')[0];
      const center = this.map.getView().getCenter();
      const zoom = this.map.getView().getZoom();
      const visibleLayers = [];
      this.map
        .getLayers()
        .getArray()
        .forEach(layer => {
          if (layer.getVisible() && layer.get('displayInLegend')) {
            visibleLayers.push(layer.get('name'));
          }
        });
      const centerLonLat = toLonLat(center)
        .map(e => e.toFixed(3))
        .reverse();
      const href = `${url}?center=${centerLonLat.toString()}&zoom=${zoom
        .toFixed(3)
        .toString()}&layers=${visibleLayers.toString()}`;
      this.editor.commands.mapview({href});
    },
    translateHtmlContent() {
      const htmlContent = this.htmlContent;
      axios
        .post(
          './api/translate',
          {content: htmlContent, targetLanguage: this.currentLanguage.code},
          {
            headers: authHeader(),
          }
        )
        .then(response => {
          this.htmlContent = response.data;
        })
        .catch(error => {
          console.log(error);
        });
    },
    addCommand(data) {
      if (data.command !== null) {
        data.command(data.data);
      }
    },
    onInit(editor) {
      this.editor = editor.editor;
    },
  },
};
</script>
<style>
.tiptap-vuetify-editor__content {
  border: 1px solid lightgray;
}

.tiptap-vuetify-editor__content img {
  width: 100%;
}

.tiptap-vuetify-editor__content p {
  margin-top: 16px !important;
  margin-bottom: 16px !important;
  min-height: 1rem;
}

.ProseMirror {
  min-height: 350px;
  outline: 0 !important;
  margin: 20px !important;
}
</style>
