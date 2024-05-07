<template>
  <v-row justify="center">
    <v-dialog v-model="dialog" persistent max-width="600px">
      <v-card>
        <v-app-bar dark :color="color" dense flat>
          <v-app-bar-nav-icon
            ><v-icon>{{ options.icon }}</v-icon></v-app-bar-nav-icon
          >
          <v-toolbar-title class="white--text">{{ title }}</v-toolbar-title>
        </v-app-bar>
        <v-card-text>
          <v-container>
            <v-alert outlined v-if="iconUrlExists" dense border="left" type="error">
              <strong>{{ $t('dashboard.iconExists') }}</strong>
            </v-alert>
            <v-alert outlined v-if="mode == 'update'" dense border="left" type="warning">
              <strong>{{ $t('dashboard.postWillUpdated') }}</strong>
            </v-alert>
            <v-form v-if="['new', 'update'].includes(mode)" ref="iconForm" v-model="valid">
              <v-row>
                <v-col v-if="icon.iconUrl" cols="3">
                  <v-img :src="icon.iconUrl" max-height="40" contain></v-img>
                </v-col>
                <v-col :cols="icon.iconUrl ? 9 : 12">
                  <v-alert
                    dense
                    class="mx-2 my-1"
                    v-if="imageUpload.message"
                    :type="imageUpload.isUploadedSuccessful === true ? 'success' : 'error'"
                  >
                    {{ imageUpload.message }}
                  </v-alert>
                  <v-progress-linear :active="imageUpload.isUploading" indeterminate :color="color"></v-progress-linear>
                  <v-text-field
                    :disabled="imageUpload.isSelecting || imageUpload.isUploading || imageUpload.selectedFile !== null"
                    v-model="icon.iconUrl"
                    clear-icon="mdi-close-circle"
                    clearable
                    :label="$t(`dashboard.iconUrl`) + `*`"
                    prepend-iimageUploadcon="fas fa-link"
                    :rules="[rules.required]"
                  >
                    <template slot="append-outer">
                      <v-tooltip left>
                        <template v-slot:activator="{on}">
                          <v-icon
                            :disabled="false"
                            @click="toggleImageUpload"
                            class="ml-2 pl-2 lock-button"
                            style="cursor: pointer"
                            v-on="on"
                          >
                            {{ imageUpload.selectedFile !== null ? 'fa fa-close' : 'fas fa-upload' }}
                          </v-icon> </template
                        ><span>{{
                          imageUpload.selectedFile !== null
                            ? $t('dashboard.clickToClear')
                            : $t('dashboard.clickToUploadIcon')
                        }}</span>
                      </v-tooltip>
                      <input
                        ref="imageUploader"
                        class="d-none"
                        type="file"
                        accept="image/*"
                        @change="onFileUploadChanged"
                      />
                    </template>
                  </v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="icon.title"
                    :label="$t(`dashboard.iconTitlePlaceholder`) + `*`"
                    prepend-icon="fas fa-heading"
                    :rules="[rules.required]"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-select
                    prepend-icon="fas fa-object-group"
                    v-model="icon.group"
                    :items="groups"
                    item-text="display"
                    item-value="value"
                    :label="$t(`dashboard.navbarGroups`) + `*`"
                    :rules="[rules.required]"
                  ></v-select>
                </v-col>
              </v-row>
            </v-form>
          </v-container>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn :disabled="valid === false" color="blue darken-1" text @click="save">{{ $t(`general.save`) }}</v-btn>
          <v-btn color="red darken-1" text @click="cancel">{{ $t(`general.close`) }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>
<script>
import {mapGetters, mapMutations} from 'vuex';
import axios from 'axios';
import Icon from '../../models/icon';

import authHeader from '../../services/auth-header';

export default {
  data: () => ({
    icon: new Icon(),
    valid: false,
    dialog: false,
    resolve: null,
    reject: null,
    confirmText: null,
    cancelText: null,
    title: null,
    mode: '',
    options: {
      color: 'primary',
      width: 320,
      icon: 'fas fa-icons',
      zIndex: 200,
    },
    rules: {
      required: value => !!value || 'Required.',
    },
    loading: false,
    iconUrlExists: false,
    imageUpload: {
      defaultButtonText: 'Upload',
      selectedFile: null,
      isSelecting: false,
      isUploading: false,
      isUploadedSuccessful: false,
      message: '',
    },
  }),
  props: {
    color: {type: String},
  },
  methods: {
    open(mode, title, confirmText, cancelText, options, icon) {
      this.cancel();
      this.mode = mode;
      if (icon) {
        this.icon = new Icon(icon.id, icon.group, icon.title, icon.iconUrl, icon.iconUrl);
      }
      this.dialog = true;
      this.title = title;
      this.confirmText = confirmText;
      this.cancelText = cancelText;
      this.options = Object.assign(this.options, options);
    },
    save() {
      let req;
      if (this.mode == 'new') {
        req = axios.post('/api/icons', this.icon, {headers: authHeader()});
      } else if (this.mode == 'update') {
        req = axios.patch('/api/icons', this.icon, {headers: authHeader()});
      }
      req
        .then(() => {
          this.toggleSnackbar({
            type: 'success',
            message:
              this.mode === 'new' ? this.$t(`dashboard.iconAddedSuccess`) : this.$t(`dashboard.iconUpdatedSuccess`),
            state: true,
            timeout: 2000,
          });
          this.$store.dispatch('app/getIcons');
        })
        .catch(() => {
          this.toggleSnackbar({
            type: 'error',
            message: this.mode === 'new' ? this.$t(`dashboard.iconAddFailed`) : this.$t(`dashboard.iconUpdateFailed`),
            state: true,
            timeout: 2000,
          });
        });

      this.cancel();
    },
    cancel() {
      this.icon = new Icon();
      if (this.$refs.iconForm) {
        this.$refs.iconForm.reset();
      }
      this.dialog = false;
      this.clearUploadImage();
    },
    openImageUpload() {
      this.imageUpload.isSelecting = true;
      window.addEventListener(
        'focus',
        () => {
          this.imageUpload.isSelecting = false;
        },
        {once: false}
      );
      this.$refs.imageUploader.click();
    },
    onFileUploadChanged(e) {
      this.imageUpload.selectedFile = e.target.files[0];
      const fileSize = this.imageUpload.selectedFile.size / 1024 / 1024;
      if (fileSize > 5) {
        this.imageUpload.message = `${this.$t('general.fileSizeExceeds')} + ' 5MB'`;
        setTimeout(() => {
          this.clearUploadImage();
        }, 2000);
      } else if (this.imageUpload.selectedFile) {
        // UPLOAD IN S3 Bucket.
        const formData = new FormData();
        if (this.imageUpload.selectedFile) {
          formData.append('folder', 'icons');
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
              this.icon.iconUrl = s3Src;
            }
            this.imageUpload.isUploading = false;
            this.imageUpload.isUploadedSuccessful = true;
            this.imageUpload.message = this.$t('dashboard.iconUploadedSuccess');
            setTimeout(() => {
              this.imageUpload.message = '';
            }, 1000);
          })
          .catch(() => {
            this.imageUpload.isUploading = false;
            this.imageUpload.message = this.$t('dashboard.iconUploadedFailed');
            setTimeout(() => {
              this.imageUpload.message = '';
            }, 1000);
            this.icon.iconUrl = '';
            this.imageUpload.isUploadedSuccessful = false;
          });
      }
    },
    clearUploadImage() {
      this.imageUpload.selectedFile = null;
      if (this.$refs.imageUpload) {
        this.$refs.imageUploader.value = null;
      }
      this.imageUpload.isUploadedSuccessful = false;
      this.imageUpload.message = '';
      this.icon.iconUrl = '';
    },
    toggleImageUpload() {
      if (this.imageUpload.selectedFile) {
        this.clearUploadImage();
      } else {
        this.openImageUpload();
      }
    },
    ...mapMutations('map', {
      toggleSnackbar: 'TOGGLE_SNACKBAR',
    }),
  },
  computed: {
    currentLanguage() {
      let countryCode = this.$i18n.locale;
      if (countryCode.includes('-')) {
        countryCode = countryCode.split('-')[0];
      }
      return countryCode;
    },
    groups() {
      const groups = [
        {
          value: 'all',
          display: this.$t('general.all'),
        },
      ];
      if (this.$appConfig.map.groups) {
        Object.keys(this.$appConfig.map.groups).forEach(value => {
          const _value = this.$appConfig.map.groupTitles[value];
          const translatedValue = _value[this.currentLanguage] || value;
          groups.push({
            value,
            display: translatedValue,
          });
        });
      }

      return groups;
    },
    ...mapGetters('app', {
      icons: 'icons',
    }),
  },
  watch: {
    'icon.iconUrl': function (newVal) {
      // Remove  space from newVal string
      if (newVal) {
        const newIcon = newVal;
        const filterTable = this.icons.filter(icon => icon.iconUrl === newIcon);
        if (
          Array.isArray(filterTable) &&
          filterTable.length > 0 &&
          filterTable[0].iconUrl !== this.icon.previousIconUrl
        ) {
          // Icon already exists in the table.
          this.icon.iconUrl = null;
          this.iconUrlExists = true;
          setTimeout(() => {
            this.iconUrlExists = false;
          }, 2000);
        }
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
