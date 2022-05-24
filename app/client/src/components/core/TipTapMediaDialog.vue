<template>
  <v-dialog v-model="show" persistent max-width="500px">
    <v-card v-if="command">
      <v-app-bar flat :color="color" height="50" dark>
        <v-icon class="mr-3">{{ data[type].toolbar_icon }}</v-icon>
        <v-toolbar-title>{{ data[type].toolbar_title }}</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-app-bar>
      <v-divider></v-divider>
      <v-progress-linear
        :active="isUploadInProgress"
        indeterminate
        :color="color"
      ></v-progress-linear>

      <v-card-text v-if="type === 'audio' || type === 'image'">
        <v-alert
          dense
          class="mx-2 my-1"
          v-if="isUploadedSuccessful === true"
          type="success"
        >
          File uploaded. Click apply to insert it!
        </v-alert>
        <v-alert dense type="error" v-if="isUploadedSuccessful === false">
          File can't upload.
        </v-alert>

        <v-text-field
          class="mt-4"
          v-model="urlSrc"
          clear-icon="mdi-close-circle"
          clearable
          label="Paste URL*"
          :disabled="isUploadInProgress"
        >
          <template slot="append-outer">
            <v-tooltip left>
              <template v-slot:activator="{ on }">
                <v-icon
                  :disabled="false"
                  class="ml-2 pl-2 lock-button"
                  style="cursor:pointer;"
                  @click="toggleFileUpload"
                  v-on="on"
                >
                  fas fa-upload
                </v-icon> </template
              ><span>Click to upload</span>
            </v-tooltip>
            <input
              ref="fileUploader"
              class="d-none"
              type="file"
              :accept="`${type === 'audio' ? 'audio/*' : 'image/*'}`"
              @change="onFileUploadChanged"
            />
          </template>
        </v-text-field>
      </v-card-text>

      <v-card-text v-if="type === 'iframe'">
        <v-text-field class="mt-4" v-model="urlSrc" id="url" label="URL" />
      </v-card-text>

      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text color="error" @click="show = false">
          Close
        </v-btn>
        <v-btn :disabled="!urlSrc" color="primary" text @click="insert">
          Apply
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script>
import { parseVideoUrl } from '../../utils/Helpers';

import authHeader from '../../services/auth-header';
import axios from 'axios';

export default {
  data() {
    return {
      isUploadInProgress: false,
      isUploadedSuccessful: '',
      file: null,
      tab: null,
      urlSrc: '',
      command: null,
      show: false,
      data: {
        image: {
          toolbar_icon: 'image',
          toolbar_title: 'Image Insert'
        },
        audio: {
          toolbar_icon: 'music_video',
          toolbar_title: 'Audio Insert'
        },
        iframe: {
          toolbar_icon: 'video_library',
          toolbar_title: 'Video Insert'
        }
      },
      color: this.$appConfig.app.color.primary
    };
  },
  methods: {
    showModal(command, type) {
      // Add the sent command
      this.clear();
      this.command = command;
      this.type = type;
      this.show = true;
    },
    insert() {
      let src = '';
      if (this.type === 'iframe') {
        src = parseVideoUrl(this.urlSrc);
      } else {
        src = this.urlSrc;
      }
      const data = {
        command: this.command,
        data: {
          src
        }
      };

      this.$emit('onConfirm', data);
      this.show = false;
    },
    openFileUpload() {
      window.addEventListener('focus', () => {}, { once: false });
      this.$refs.fileUploader.click();
    },
    onFileUploadChanged(e) {
      this.file = e.target.files[0];
      if (this.file) {
        // UPLOAD IN S3 Bucket.
        const formData = new FormData();
        if (this.file) {
          formData.append('file', this.file);
        }
        this.isUploadInProgress = true;
        axios
          .post('api/upload', formData, {
            headers: authHeader()
          })
          .then(res => {
            if (res.data.fileUrl) {
              this.urlSrc = res.data.fileUrl;
              this.isUploadedSuccessful = true;
            }
            setTimeout(() => {
              this.isUploadedSuccessful = '';
            }, 2000);
            this.isUploadInProgress = false;
          })
          .catch(() => {
            this.isUploadInProgress = false;
            this.isUploadedSuccessful = false;
          });
      }
    },
    toggleFileUpload() {
      if (this.file) {
        this.clearFile();
      } else {
        this.openFileUpload();
      }
    },
    clearFile() {
      this.file = null;
      this.isUploadedSuccessful = '';
    },
    clear() {
      this.tab = null;
      this.type = null;
      this.clearFile();
      this.urlSrc = '';
    }
  },
  computed: {}
};
</script>
