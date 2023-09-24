<template>
  <v-dialog v-model="lightboxDialogState" scrollable persistent max-width="600px">
    <v-card>
      <v-app-bar dark dense flat>
        <v-app-bar-nav-icon><v-icon>image</v-icon></v-app-bar-nav-icon>
        <v-toolbar-title class="white--text">{{ $t(`form.lightbox.title`) }}</v-toolbar-title>
      </v-app-bar>
      <v-progress-linear class="mb-1" :active="imageUpload.isUploading" indeterminate></v-progress-linear>
      <v-row class="my-2 mx-0 pa-0" justify="center" align="center">
        <v-btn :disabled="!valid" @click="addImage"> <v-icon left> mdi-plus </v-icon>Add Image </v-btn>
        <input ref="imageUploader" class="d-none" type="file" accept="image/*" @change="onFileUploadChanged" />
      </v-row>
      <v-divider></v-divider>

      <vue-scroll ref="vs" :ops="ops">
        <v-form
          v-if="['new', 'update'].includes(mode)"
          v-model="valid"
          ref="lightbogImageForm"
          :disabled="imageUpload.isUploading"
        >
          <template v-for="(image, index) in lightboxImages">
            <div :key="index" class="mt-3 pa-0">
              <v-row :id="`image_${index}`" class="ml-2 mr-3 pa-0">
                <v-col align="center" justify="center" class="ma-0 mb-2 pa-0 elevation-1" :cols="4">
                  <v-img
                    style="background-color: #fafafa"
                    class="mx-0 mt-3"
                    :src="image.imageUrl || 'icons/no_image.png'"
                    max-height="140px"
                    contain
                  >
                    <template v-slot:placeholder>
                      <v-row class="fill-height ma-0" align="center" justify="center">
                        <v-progress-circular indeterminate color="grey lighten-5"></v-progress-circular>
                      </v-row>
                    </template>
                  </v-img>
                  <v-spacer></v-spacer>
                  <v-tooltip top>
                    <template v-slot:activator="{on}">
                      <v-btn @click="deleteImage(index)" v-on="on" icon>
                        <v-icon>delete</v-icon>
                      </v-btn> </template
                    ><span>{{ $t('form.lightbox.deleteImage') }}</span></v-tooltip
                  >
                </v-col>
                <v-col align="center" justify="center" class="ma-0 pa-0 pl-2" :cols="image.imageUrl ? 8 : 0">
                  <v-row>
                    <v-col cols="12" class="my-0 py-0">
                      <v-text-field
                        :disabled="
                          imageUpload.isSelecting || imageUpload.isUploading || imageUpload.selectedFile !== null
                        "
                        v-model="image.imageUrl"
                        clear-icon="mdi-close-circle"
                        clearable
                        :label="$t(`form.lightbox.imageUrl`) + '*'"
                        :rules="[rules.required]"
                      >
                        <template slot="append-outer">
                          <v-tooltip left>
                            <template v-slot:activator="{on}">
                              <v-icon
                                :disabled="false"
                                @click="toggleImageUpload(index)"
                                class="ml-2 pl-2 lock-button"
                                style="cursor: pointer"
                                v-on="on"
                              >
                                fas fa-upload
                              </v-icon> </template
                            ><span>{{ $t('form.lightbox.clickToUploadImage') }}</span>
                          </v-tooltip>
                        </template>
                      </v-text-field>
                    </v-col>
                    <v-text-field
                      class="mx-4"
                      v-model="image.caption"
                      item-text="display"
                      item-value="value"
                      clear-icon="mdi-close-circle"
                      clearable
                      :label="$t(`form.lightbox.imageCaption`)"
                    ></v-text-field>
                  </v-row>
                </v-col>
              </v-row>
              <v-divider></v-divider>
            </div>
          </template>
        </v-form>
      </vue-scroll>
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" :disabled="!valid" text @click="save">{{ $t('general.save') }}</v-btn>
        <v-btn color="red darken-1" text @click="cancel">{{ $t('general.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script>
import {mapMutations} from 'vuex';
import {mapFields} from 'vuex-map-fields';
import axios from 'axios';
import authHeader from '../../services/auth-header';
import UrlUtil from '../../utils/Url';

export default {
  data: () => ({
    ops: {
      scrollPanel: {
        scrollingX: false,
      },
    },
    valid: true,
    mode: 'new', // change this later
    lightboxImages: [],
    rules: {
      required: value => !!value || 'Required.',
    },
    imageUpload: {
      defaultButtonText: 'Upload',
      selectedFile: null,
      isSelecting: false,
      isUploading: false,
      isUploadedSuccessful: false,
      message: '',
      index: null,
    },
  }),
  methods: {
    save() {
      // Update lightbox value in the selected Popup
      this.formData.lightbox = JSON.stringify(this.lightboxImages);
      // Clear and Close
      this.cancel();
    },
    cancel() {
      this.clearUploadImage();
      this.lightboxDialogState = false;
      this.lightboxImages = [];
    },

    addImage() {
      this.lightboxImages.push({imageUrl: '', caption: ''});
      setTimeout(() => {
        this.$nextTick(() => {
          const scrollEl = this.$refs.vs;
          if (scrollEl && scrollEl.scrollTo) {
            scrollEl.scrollIntoView(`#image_${this.lightboxImages.length - 1}`, 200);
          }
        });
      }, 100);
    },
    deleteImage(index) {
      this.lightboxImages.splice(index, 1);
    },
    onFileUploadChanged(e) {
      this.imageUpload.selectedFile = e.target.files[0];
      const fileSize = this.imageUpload.selectedFile.size / 1024 / 1024;
      if (fileSize > 5) {
        this.imageUpload.message = `${this.$t('general.fileSizeExceeds')} 5MB`;
        setTimeout(() => {
          this.clearUploadImage();
        }, 2000);
      } else if (this.imageUpload.selectedFile) {
        // UPLOAD IN S3 Bucket.
        const formData = new FormData();
        if (this.imageUpload.selectedFile) {
          formData.append('folder', 'images');
          formData.append('file', this.imageUpload.selectedFile);
        }
        this.imageUpload.isUploading = true;
        axios
          .post('api/upload', formData, {
            headers: authHeader(),
          })
          .then(res => {
            if (res.data.fileUrl) {
              const s3Src = res.data.fileUrl;
              this.lightboxImages[this.imageUpload.index].imageUrl = s3Src;
            }
            this.imageUpload.isUploading = false;
            this.imageUpload.isUploadedSuccessful = true;
            this.imageUpload.message = this.$t('form.lightbox.imageUploadSuccess');
            setTimeout(() => {
              this.imageUpload.message = '';
              this.clearUploadImage();
            }, 1000);
          })
          .catch(() => {
            this.imageUpload.isUploading = false;
            this.imageUpload.message = this.$t('form.lightbox.imageUploadFailed');
            setTimeout(() => {
              this.imageUpload.message = '';
              this.clearUploadImage();
            }, 1000);
            this.imageUpload.index = null;
            this.imageUpload.isUploadedSuccessful = false;
          });
      }
    },
    openImageUpload(index) {
      this.imageUpload.isSelecting = true;
      this.imageUpload.index = index;
      window.addEventListener(
        'focus',
        () => {
          this.imageUpload.isSelecting = false;
        },
        {once: false}
      );
      this.$refs.imageUploader.click();
    },
    clearUploadImage() {
      this.imageUpload.selectedFile = null;
      if (this.$refs.imageUpload) {
        this.$refs.imageUploader.value = null;
      }
      this.imageUpload.isUploadedSuccessful = false;
      this.imageUpload.message = '';
      this.imageUpload.index = null;
    },
    toggleImageUpload(index) {
      if (this.imageUpload.selectedFile) {
        this.clearUploadImage();
      } else {
        this.openImageUpload(index);
      }
    },
    ...mapMutations('map', {
      toggleSnackbar: 'TOGGLE_SNACKBAR',
    }),
  },
  computed: {
    ...mapFields('map', {
      lightboxDialogState: 'lightboxDialogState',
      formData: 'formData',
    }),
  },
  watch: {
    lightboxDialogState(val) {
      if (val) {
        const {lightbox} = this.formData;
        if (lightbox) {
          const images = Array.isArray(lightbox) ? lightbox : JSON.parse(lightbox);
          if (!Array.isArray(images)) return;
          images.forEach(image => {
            let imageUrl;
            let caption = '';
            if (typeof image === 'object') {
              // Image is stored as object. Get imageUrl and caption values
              imageUrl = image.imageUrl;
              caption = image.caption;
            } else {
              // Image is stored as a string
              imageUrl = image;
            }
            const url = UrlUtil.parseUrl(imageUrl);
            this.lightboxImages.push({
              imageUrl: url,
              caption,
            });
          });
        }
      } else {
        this.lightboxImages = [];
      }
    },
  },
};
</script>
<style>
.lock-button {
  pointer-events: auto;
}
</style>
