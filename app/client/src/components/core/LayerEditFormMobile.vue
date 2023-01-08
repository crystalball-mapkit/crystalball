<template>
  <v-card v-if="selectedLayer">
    <!-- <v-toolbar
      class="ma-0 pa-0 elevation-0"
      :color="$appConfig.app.color.primary"
      flat
      height="40"
      dark
    >

    </v-toolbar> -->

    <v-card-text>
      <v-toolbar-title>{{ editType == 'modifyAttributes' ? $t('form.edit.editAttributes') : $t('form.edit.addAttributes') }}</v-toolbar-title>
      <v-divider class="mb-4"></v-divider>
      <div>
        <vue-scroll ref="vs">
          <div>
            <v-form ref="edit-form" v-model="formValid">
              <editor-form v-model="formData" :schema="formSchema" :options="formOptions">
                <template slot="lightbox-append">
                  <v-btn
                    style="cursor: pointer"
                    @click="lightboxDialogState = true"
                    class="mx-2 mb-2 lock-button elevation-1"
                    depressed
                    fab
                    small
                  >
                    <v-icon> fas fa-image </v-icon>
                  </v-btn>
                </template>
              </editor-form>
            </v-form>
          </div>
        </vue-scroll>
      </div>
    </v-card-text>

    <v-divider class="mt-2"></v-divider>
    <v-card-actions class="pt-0 mt-1">
      <div>
        <div v-show="!imageUpload.errorMessage">
          <v-tooltip top>
            <template v-slot:activator="{on}">
              <v-btn v-on="on" rounded small depressed :loading="imageUpload.isSelecting" @click="openImageUpload">
                <v-icon left> insert_photo </v-icon>
                <span class="image-upload-btn">
                  {{ imageUploadButtonText }}
                </span>
              </v-btn>
            </template>
            <span>{{ $t('form.edit.uploadImage') }}</span>
          </v-tooltip>
          <input ref="imageUploader" class="d-none" type="file" accept="image/*" @change="onFileUploadChanged" />
          <v-btn v-if="imageUpload.selectedFile" class="ml-1" @click="clearUploadImage()" small icon>
            <v-icon small>close</v-icon>
          </v-btn>
        </div>
        <div v-if="imageUpload.errorMessage" class="red--text text--lighten-1 subtitle-2">
          {{ imageUpload.errorMessage }}
        </div>

        <div v-if="imageUpload.selectedFile">
          <v-menu class="mt-2" origin="center center" transition="scale-transition">
            <template v-slot:activator="{on, attrs}">
              <v-btn class="mt-2" rounded small depressed v-on="on" v-bind="attrs">
                <v-icon left
                  >{{ imageUpload.position === 'sidebarMediaTop' ? 'picture_in_picture' : 'picture_in_picture_alt' }}
                </v-icon>
                <span
                  >{{ $t('general.sidebar') }}:
                  {{ imageUpload.position === 'sidebarMediaTop' ? $t('general.top') : $t('general.bottom') }}</span
                >
              </v-btn>
            </template>
            <v-list dense>
              <v-list-item
                @click="
                  imageUpload.position === 'sidebarMediaTop'
                    ? (imageUpload.position = 'sidebarMediaBottom')
                    : (imageUpload.position = 'sidebarMediaTop')
                "
              >
                <v-list-item-content>
                  <v-list-item-title>{{
                    imageUpload.position === 'sidebarMediaTop' ? $t('general.bottom') : $t('general.top')
                  }}</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </div>
      <v-spacer></v-spacer>
      <template>
        <v-btn color="primary darken-1" :disabled="formValid === false" @click="popupOk" text>{{
          $t('general.save')
        }}</v-btn>

        <v-btn color="grey" text @click="popupCancel">{{ $t('general.cancel') }}</v-btn>
      </template>
    </v-card-actions>
  </v-card>
</template>

<script>
import {mapFields} from 'vuex-map-fields';
import {mapGetters} from 'vuex';

// eslint-disable-next-line import/extensions
import VJsf from '@koumoul/vjsf';
import {EventBus} from '../../EventBus';

export default {
  components: {
    'editor-form': VJsf,
  },
  computed: {
    ...mapFields('map', {
      isEditingLayer: 'isEditingLayer',
      isEditingPost: 'isEditingPost',
      selectedLayer: 'selectedLayer',
      postFeature: 'postFeature',
      postEditType: 'postEditType',
      formValid: 'formValid',
      formSchema: 'formSchema',
      formSchemaCache: 'formSchemaCache',
      formOptions: 'formOptions',
      formData: 'formData',
      imageUpload: 'imageUpload',
      lightboxDialogState: 'lightboxDialogState',
    }),
    ...mapGetters('map', {
      imageUploadButtonText: 'imageUploadButtonText',
      editType: 'editType',
    }),
  },
  created() {
    EventBus.$on('clearUploadImage', this.clearUploadImage);
    EventBus.$on('open-image-upload', () => {
      this.$refs.imageUploader.click();
    });
  },
  methods: {
    popupOk() {
      EventBus.$emit('popupOk');
    },
    popupCancel() {
      EventBus.$emit('popupCancel');
    },
    openImageUpload() {
      EventBus.$emit('openImageUpload');
    },
    onFileUploadChanged(e) {
      EventBus.$emit('onFileUploadChanged', e);
    },
    clearUploadImage() {
      this.imageUpload.selectedFile = null;
      if (this.$refs.imageUploader) {
        this.$refs.imageUploader.value = null;
      }
      this.imageUpload.errorMessage = '';
      this.imageUpload.position = 'sidebarMediaTop';
    },
  },
};
</script>

<style></style>
