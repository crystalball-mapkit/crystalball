<template>
  <div ref="editorWrap" class="tiptap-editor-wrap">
    <media-dialog ref="mediadialog" @onConfirm="addCommand" />

    <tip-tap-expansion-dialog
      ref="tiptap-expansion-dialog"
      @onConfirm="addCommand"
      @onEditConfirm="updateExpansionTitle"
    ></tip-tap-expansion-dialog>

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
import authHeader from '../../services/auth-header';

export default {
  components: {TiptapVuetify, MediaDialog, TipTapExpansionDialog},
  props: {
    map: {type: Object},
  },
  data: () => ({
    editor: null,
    _editorDom: null,
    _onEditorDoubleClick: null,
    extensions: [
      History,
      Blockquote,
      [
        Link,
        {
          options: {
            target: '_blank',
          },
        },
      ],
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

    async translateApiContent(content, targetLanguage) {
      const response = await axios.post(
        './api/translate',
        {content, targetLanguage},
        {
          headers: authHeader(),
        }
      );
      return response.data;
    },

    createAccordionPlaceholder(token) {
      return `<div data-expansion-placeholder="${token}"></div>`;
    },

    extractFirstDirectContentInnerHTML(section) {
      const directContent = Array.from(section.children).find(
        child => child.tagName === 'DIV' && child.classList.contains('content')
      );
      return directContent ? directContent.innerHTML : '';
    },

    buildAccordionHtml({uid, title, contentHtml}) {
      return [
        `<section class="ep-accordion" data-expansion-uid="${uid}">`,
        `<input type="checkbox" name="collapse" id="${uid}">`,
        `<h2 class="handle"><label for="${uid}">${title}</label></h2>`,
        `<div class="content">${contentHtml}</div>`,
        `</section>`,
      ].join('');
    },

    async batchTranslateAccordionTitles(accordions, targetLanguage) {
      if (!accordions.length) return {};

      const payload = accordions
        .map((accordion, index) => `<p data-wg-title-index="${index}">${accordion.title || ''}</p>`)
        .join('');

      const translatedHtml = await this.translateApiContent(payload, targetLanguage);
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div id="wg-title-batch-root">${translatedHtml}</div>`, 'text/html');
      const root = doc.querySelector('#wg-title-batch-root');
      const translatedTitles = {};

      if (!root) {
        accordions.forEach(accordion => {
          translatedTitles[accordion.token] = accordion.title;
        });
        return translatedTitles;
      }

      accordions.forEach((accordion, index) => {
        const node = root.querySelector(`[data-wg-title-index="${index}"]`);
        translatedTitles[accordion.token] = node ? node.textContent.trim() : accordion.title;
      });

      return translatedTitles;
    },

    async batchTranslateAccordionBodies(accordions, targetLanguage) {
      if (!accordions.length) return {};

      const payload = accordions
        .map((accordion, index) => `<div data-wg-content-index="${index}">${accordion.contentHtml || ''}</div>`)
        .join('');

      const translatedHtml = await this.translateApiContent(payload, targetLanguage);
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div id="wg-content-batch-root">${translatedHtml}</div>`, 'text/html');
      const root = doc.querySelector('#wg-content-batch-root');
      const translatedBodies = {};

      if (!root) {
        accordions.forEach(accordion => {
          translatedBodies[accordion.token] = accordion.contentHtml;
        });
        return translatedBodies;
      }

      accordions.forEach((accordion, index) => {
        const node = root.querySelector(`[data-wg-content-index="${index}"]`);
        translatedBodies[accordion.token] = node ? node.innerHTML : accordion.contentHtml;
      });

      return translatedBodies;
    },

    async translateHtmlContent() {
      const originalHtml = this.htmlContent || '';
      const targetLanguage = this.currentLanguage.code;

      try {
        const parser = new DOMParser();
        const workingDoc = parser.parseFromString(`<div id="wg-root">${originalHtml}</div>`, 'text/html');
        const root = workingDoc.querySelector('#wg-root');

        if (!root) return;

        const accordionNodes = Array.from(root.querySelectorAll('section.ep-accordion'));
        const accordions = [];

        accordionNodes.forEach((section, index) => {
          const checkbox = section.querySelector('input[type="checkbox"]');
          const uid =
            section.getAttribute('data-expansion-uid') ||
            (checkbox ? checkbox.getAttribute('id') : null) ||
            `${Date.now()}-${index}`;

          const label = section.querySelector('h2.handle label');
          const title = label ? label.textContent.trim() : '';
          const contentHtml = this.extractFirstDirectContentInnerHTML(section);
          const token = `__WG_EXPANSION_${index}__`;

          accordions.push({
            token,
            uid,
            title,
            contentHtml,
          });

          section.outerHTML = this.createAccordionPlaceholder(token);
        });

        const translatedOuterHtml = await this.translateApiContent(root.innerHTML, targetLanguage);

        const translatedTitles = await this.batchTranslateAccordionTitles(accordions, targetLanguage);

        const translatedBodies = await this.batchTranslateAccordionBodies(accordions, targetLanguage);

        const translatedDoc = parser.parseFromString(
          `<div id="wg-translated-root">${translatedOuterHtml}</div>`,
          'text/html'
        );
        const translatedRoot = translatedDoc.querySelector('#wg-translated-root');

        if (!translatedRoot) return;

        accordions.forEach(accordion => {
          const placeholder = translatedRoot.querySelector(`[data-expansion-placeholder="${accordion.token}"]`);

          if (!placeholder) return;

          const rebuiltAccordion = this.buildAccordionHtml({
            uid: accordion.uid,
            title: translatedTitles[accordion.token] || accordion.title,
            contentHtml: translatedBodies[accordion.token] || accordion.contentHtml,
          });

          placeholder.outerHTML = rebuiltAccordion;
        });

        this.htmlContent = translatedRoot.innerHTML;
      } catch (error) {
        console.log(error);
      }
    },

    addCommand(data) {
      if (data.command !== null) {
        data.command(data.data);
      }
    },

    updateExpansionTitle({uid, title}) {
      if (this.editor && this.editor.commands && this.editor.commands.updateExpansionTitle) {
        this.editor.commands.updateExpansionTitle({uid, title});
      }
    },

    onEditorDoubleClick(e) {
      const label = e.target.closest('.ep-accordion .handle label');
      if (!label) return;

      const section = label.closest('section.ep-accordion');
      if (!section) return;

      const uid = section.getAttribute('data-expansion-uid');
      const title = label.textContent ? label.textContent.trim() : '';

      e.preventDefault();
      e.stopPropagation();

      this.$refs['tiptap-expansion-dialog'].showEditModal(uid, title);
    },

    onInit(editor) {
      this.editor = editor.editor;
      const dom = editor.editor.view.dom;
      this._editorDom = dom;

      this._onEditorDoubleClick = e => this.onEditorDoubleClick(e);
      dom.addEventListener('dblclick', this._onEditorDoubleClick);
    },
  },

  beforeDestroy() {
    if (this._editorDom && this._onEditorDoubleClick) {
      this._editorDom.removeEventListener('dblclick', this._onEditorDoubleClick);
    }
  },
};
</script>

<style>
.tiptap-editor-wrap {
  position: relative;
}

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

.ProseMirror .ep-accordion .handle label {
  cursor: pointer;
}
</style>
