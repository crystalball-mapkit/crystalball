<template>
  <div v-if="postFeature === null && isEditingPost && editType !== 'update'">
    <v-btn
      v-if="currentResolution && currentResolution <= minResolution"
      rounded
      large
      :color="color"
      dark
      @click="addPost"
    >
      ADD POST
    </v-btn>
    <v-alert v-if="currentResolution && currentResolution > minResolution" dense border="left" type="warning"
      >Zoom in close to add your post.</v-alert
    >
    <confirm-unsave ref="confirm" :color="color"></confirm-unsave>
  </div>
</template>

<script>
import {mapGetters} from 'vuex';
import {mapFields} from 'vuex-map-fields';

import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import ConfirmDialog from '../../../core/ConfirmDialog.vue';

export default {
  props: {
    map: {type: Object, required: true},
    color: {type: String},
  },
  components: {
    'confirm-unsave': ConfirmDialog,
  },
  data() {
    return {};
  },
  computed: {
    ...mapGetters('map', {
      currentResolution: 'currentResolution',
    }),
    ...mapFields('map', {
      htmlContent: 'htmlContent',
      isEditingPost: 'isEditingPost',
      isEditingHtml: 'isEditingHtml',
      postEditLayer: 'postEditLayer',
      editType: 'postEditType',
      postFeature: 'postFeature',
    }),
    minResolution() {
      return this.$appConfig.map.addPost ? this.$appConfig.map.addPost.minResolution : 100;
    },
  },
  methods: {
    enablePostEdit() {
      this.isEditingHtml = false;
      this.htmlContent = '';
      const feature = new Feature({
        geom: new Point(this.map.getView().getCenter()),
        icon: '',
      });
      feature.setGeometryName('geom');
      this.postEditLayer.getSource().clear();
      this.postEditLayer.getSource().addFeature(feature);
      this.postFeature = feature;
    },
    addPost() {
      if (this.isEditingHtml) {
        this.$refs.confirm
          .open('Warning', 'You have unsaved changes! Are you sure you want to continue?', 'Yes', 'Cancel', {
            color: this.color,
          })
          .then(confirm => {
            if (confirm) {
              this.enablePostEdit();
            }
          });
      } else {
        this.enablePostEdit();
      }
    },
  },
};
</script>

<style></style>
