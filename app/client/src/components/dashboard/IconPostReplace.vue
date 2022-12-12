<template>
  <v-row justify="center">
    <v-dialog v-model="dialog" persistent max-width="600px">
      <v-card>
        <v-app-bar dark :color="color" dense flat>
          <v-app-bar-nav-icon><v-icon>fas fa-exchange-alt</v-icon></v-app-bar-nav-icon>
          <v-toolbar-title class="white--text">Update Existing Posts and Delete Icon</v-toolbar-title>
        </v-app-bar>
        <v-card-text>
          <v-container>
            <v-alert dense border="left" type="warning" class="mx-0">
              {{
                `${count} ${count == 1 ? 'post' : 'posts'} ${
                  count == 1 ? 'has' : 'have'
                } the selected icon as reference. Please select a new icon to update the exisiting posts before deleting!`
              }}
            </v-alert>
            <v-form ref="iconReplaceForm" v-model="valid">
              <v-row>
                <v-col v-if="icon.previousIconUrl" cols="2">
                  <v-img :src="icon.previousIconUrl" max-height="40" contain></v-img>
                </v-col>
                <v-col :cols="icon.previousIconUrl ? 10 : 12">
                  <v-text-field
                    :disabled="true"
                    v-model="icon.previousIconUrl"
                    clear-icon="mdi-close-circle"
                    label="Icon To Delete"
                    prepend-icon="fas fa-link"
                    :rules="[rules.required]"
                  >
                  </v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-select
                    v-model="icon.iconUrl"
                    :items="icons.filter(i => i.iconUrl !== icon.previousIconUrl)"
                    item-text="iconUrl"
                    item-value="iconUrl"
                    label="Icon to update existing posts"
                    :rules="[rules.required]"
                  >
                    <template slot="selection" slot-scope="{item}">
                      <img class="mr-2" style="max-width: 30px; max-height: 30px" :src="item.iconUrl" />
                      <span class="short-text">{{ `Group: ${item.group} - Url: ${item.iconUrl}` }}</span>
                    </template>
                    <template slot="item" slot-scope="{item}">
                      <img class="mr-2" style="max-width: 40px; max-height: 40px" :src="item.iconUrl" />
                      <span class="short-text">{{ `Group: ${item.group} - Url: ${item.iconUrl}` }}</span>
                    </template>
                  </v-select>
                </v-col>
              </v-row>
            </v-form>
          </v-container>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn :disabled="valid === false" color="blue darken-1" text @click="save">Replace and Delete</v-btn>
          <v-btn color="red darken-1" text @click="cancel">Close</v-btn>
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
    count: 0,
  }),
  props: {
    color: {type: String},
  },
  methods: {
    open(count, icon, options) {
      this.cancel();
      if (icon) {
        this.icon = new Icon(icon.id, icon.group, icon.title, null, icon.iconUrl);
      }
      this.dialog = true;
      this.options = Object.assign(this.options, options);
      this.count = count;
    },
    save() {
      axios
        .post('/api/icons/replace_posts', this.icon, {headers: authHeader()})
        .then(() => {
          axios
            .delete(`/api/icons/${this.icon.id}`, {headers: authHeader()})
            .then(() => {
              this.toggleSnackbar({
                type: 'success',
                message: 'Post icons updated succesfully',
                state: true,
                timeout: 2000,
              });
              this.$store.dispatch('app/getIcons');
            })
            .catch(() => {
              this.toggleSnackbar({
                type: 'error',
                message: "Can't replace the post icons",
                state: true,
                timeout: 2000,
              });
            });
          this.cancel();
        })
        .catch(() => {
          this.toggleSnackbar({
            type: 'error',
            message: "Can't replace the post icons",
            state: true,
            timeout: 2000,
          });
          this.cancel();
        });
    },
    cancel() {
      this.icon = new Icon();
      if (this.$refs.iconReplaceForm) {
        this.$refs.iconReplaceForm.reset();
      }
      this.dialog = false;
    },
    ...mapMutations('map', {
      toggleSnackbar: 'TOGGLE_SNACKBAR',
    }),
  },
  computed: {
    ...mapGetters('app', {
      icons: 'icons',
    }),
  },
  watch: {},
};
</script>
<style>
.lock-button {
  pointer-events: auto;
}
.short-text {
  width: 450px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
