<template>
  <div>
    <v-card>
      <v-card-title>
        Post Icons
      </v-card-title>
      <div class="d-flex flex-row">
        <div class="flex-grow-1 pa-2">
          <v-btn @click="addNewIcon" class="lighten-1" :color="color" dark>
            New Icon
            <v-icon right dark>add</v-icon>
          </v-btn>
        </div>

        <v-spacer></v-spacer>
        <v-text-field
          class="mr-3"
          v-model="search"
          append-icon="mdi-magnify"
          label="Search"
          single-line
          hide-details
        ></v-text-field>
      </div>

      <v-progress-linear
        :active="loading"
        indeterminate
        :color="color"
      ></v-progress-linear>
      <v-data-table
        v-if="icons && Array.isArray(icons)"
        hide-default-header
        :headers="headers"
        :items="icons"
        :search="search"
        :items-per-page="10"
        class="elevation-1"
      >
        <template v-slot:header="{ props: { headers } }">
          <thead>
            <tr>
              <th v-for="header in headers" :key="header.text">
                <div
                  v-if="header.value == 'iconUrl'"
                  :class="`text-${header.align}`"
                >
                  <v-icon small>fas fa-link</v-icon> {{ header.text }}
                </div>
                <div
                  v-else-if="header.value == 'group'"
                  :class="`text-${header.align}`"
                >
                  <v-icon small>fas fa-object-group</v-icon> {{ header.text }}
                </div>
                <div
                  v-else-if="header.value == 'title'"
                  :class="`text-${header.align}`"
                >
                  <v-icon small>fas fa-heading</v-icon> {{ header.text }}
                </div>

                <div v-else :class="`text-${header.align}`">
                  {{ header.text }}
                </div>
              </th>
            </tr>
          </thead>
        </template>
        <template v-slot:body="{ items }">
          <tbody>
            <tr v-for="icon in items" :key="icon.id">
              <td>
                <v-img
                  :src="icon.iconUrl"
                  max-height="40"
                  max-width="40"
                  contain
                ></v-img>
              </td>
              <td>{{ icon.iconUrl }}</td>
              <td>{{ icon.group }}</td>
              <td>{{ icon.title }}</td>
              <td>
                <div>
                  <v-tooltip top>
                    <template v-slot:activator="{ on }">
                      <v-btn
                        v-on="on"
                        @click="editIcon(icon)"
                        class="ma-1"
                        small
                        outlined
                        icon
                        color="info"
                      >
                        <v-icon small>edit</v-icon>
                      </v-btn>
                    </template>
                    <span>Edit</span></v-tooltip
                  >
                  <v-tooltip top>
                    <template v-slot:activator="{ on }">
                      <v-btn
                        v-on="on"
                        @click="trash(icon)"
                        class="ma-1"
                        small
                        outlined
                        icon
                        :color="color"
                      >
                        <v-icon small>delete</v-icon>
                      </v-btn>
                    </template>
                    <span>Delete</span></v-tooltip
                  >
                </div>
              </td>
            </tr>
          </tbody>
        </template>
      </v-data-table>
      <!-- DIALOGS -->
      <confirm-dialog ref="confirm"></confirm-dialog>
      <icon-form-dialog ref="iconForm" :color="color"></icon-form-dialog>
      <icon-post-replace-dialog
        ref="iconReplaceForm"
      ></icon-post-replace-dialog>
    </v-card>
  </div>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex';
import ConfirmDialog from './ConfirmDelete';
import IconFormDialog from './IconForm.vue';
import IconPostReplace from './IconPostReplace.vue';
import authHeader from '../../services/auth-header';
import axios from 'axios';

export default {
  data() {
    return {
      headers: [
        {
          text: '',
          value: false,
          align: 'left',
          sortable: false
        },
        { text: 'Icon URL', value: 'iconUrl', align: 'left', sortable: false },
        {
          text: 'Group Name',
          value: 'group',
          align: 'left',
          sortable: false
        },
        {
          text: 'Sidebar Title',
          value: 'title',
          align: 'left',
          sortable: false
        },
        { text: 'Action', value: false, align: 'left', sortable: false }
      ],
      color: this.$appConfig.app.color.primary,
      loading: false,
      search: ''
    };
  },
  computed: {
    ...mapGetters('app', {
      icons: 'icons'
    })
  },
  components: {
    'confirm-dialog': ConfirmDialog,
    'icon-form-dialog': IconFormDialog,
    'icon-post-replace-dialog': IconPostReplace
  },
  methods: {
    trash(icon) {
      // Count the html posts that are using this icon
      axios
        .post(`/api/icons/count-posts`, icon, {
          headers: authHeader()
        })
        .then(response => {
          const count = parseInt(response.data.count);
          if (count > 0) {
            this.$refs.iconReplaceForm.open(count, icon, {
              color: this.color
            });
          } else {
            this.$refs.confirm
              .open(
                'Confirm Delete',
                `Delete the selected icon ?`,
                'Yes',
                'No',
                {
                  color: this.color
                }
              )
              .then(confirm => {
                if (confirm) {
                  this.loading = true;
                  axios
                    .delete(`/api/icons/${icon.id}`, { headers: authHeader() })
                    .then(() => {
                      this.loading = false;
                      this.toggleSnackbar({
                        type: 'success',
                        message: 'Icon deleted successfully',
                        state: true,
                        timeout: 2000
                      });
                      this.$store.dispatch('app/getIcons');
                    })
                    .catch(() => {
                      this.loading = false;
                      this.toggleSnackbar({
                        type: 'error',
                        message: "Can't delete icon",
                        state: true,
                        timeout: 2000
                      });
                    });
                }
              });
          }
        })
        .catch(error => {
          console.log(error);
        });
    },
    editIcon(icon) {
      this.$refs.iconForm.open(
        'update',
        'Update Icon',
        'Update',
        'Cancel',
        {
          color: this.color,
          icon: 'edit'
        },
        icon
      );
    },
    addNewIcon() {
      this.$refs.iconForm.open('new', 'New Icon', 'Save', 'Cancel', {
        color: this.color
      });
    },
    ...mapMutations('map', {
      toggleSnackbar: 'TOGGLE_SNACKBAR'
    })
  }
};
</script>

<style></style>
