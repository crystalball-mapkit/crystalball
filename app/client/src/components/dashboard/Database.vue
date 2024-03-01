<template>
  <div>
    <v-card>
      <v-progress-linear :active="!!isRestoreInProgress" indeterminate :color="color"></v-progress-linear>
      <v-card-title> {{ $t('dashboard.databaseRestore') }} </v-card-title>
      <v-file-input
        class="mx-2"
        label="PostgreSQL Dump*"
        variant="outlined"
        ref="postgresFile"
        @change="onFileUploadChanged($event, 'postgres')"
        accept=".pgdump"
      ></v-file-input>
      <v-card-title> {{ $t('dashboard.geoserverDataDirRestore') }} </v-card-title>
      <v-file-input
        class="mx-2"
        label="Geoserver Dir (.zip)"
        ref="geoserverFile"
        variant="outlined"
        @change="onFileUploadChanged($event, 'geoserver')"
        accept=".zip"
      ></v-file-input>
      <div class="d-flex flex-row pa-4">
        <v-spacer></v-spacer>
        <v-btn
          class="mt-2 mr-5"
          @click="restore"
          :disabled="isRestoreInProgress || (!geoserverFile && !postgresFile)"
          color="error"
          >{{ $t('dashboard.restore') }}</v-btn
        >
      </div>
    </v-card>
  </div>
</template>
<script>
import axios from 'axios';
import {mapMutations} from 'vuex';
import authHeader from '../../services/auth-header';

export default {
  data() {
    return {
      geoserverFile: null,
      postgresFile: null,
      isRestoreInProgress: false,
      color: this.$appConfig.app.color.primary,
    };
  },
  methods: {
    ...mapMutations('map', {
      toggleSnackbar: 'TOGGLE_SNACKBAR',
    }),
    onFileUploadChanged(e, type) {
      if (type === 'geoserver') {
        this.geoserverFile = e;
      } else {
        this.postgresFile = e;
      }
    },
    restore() {
      const formData = new FormData();
      if (this.geoserverFile) {
        formData.append('geoserver', this.geoserverFile);
      }
      if (this.postgresFile) {
        formData.append('postgres', this.postgresFile);
      }
      this.isRestoreInProgress = true;
      axios
        .post('/api/restore', formData, {
          headers: authHeader(),
        })
        .then(res => {
          if (res.status === 200) {
            this.toggleSnackbar({
              type: 'success',
              message: this.$t('dashboard.restoreSuccess'),
              state: true,
              timeout: 2000,
            });
          }
        })
        .catch(() => {
          this.toggleSnackbar({
            type: 'error',
            message: this.$t('dashboard.restoreFailed'),
            state: true,
            timeout: 2000,
          });
        })
        .finally(() => {
          this.reset();
        });
    },
    reset() {
      this.isRestoreInProgress = false;
      this.geoserverFile = null;
      this.postgresFile = null;
      this.$refs.geoserverFile.reset();
      this.$refs.postgresFile.reset();
    },
  },
};
</script>
