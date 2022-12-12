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
  </div>
</template>

<script>
import {mapGetters} from 'vuex';
import {mapFields} from 'vuex-map-fields';

import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';

export default {
  props: {
    map: {type: Object, required: true},
    color: {type: String},
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
    addPost() {
      const feature = new Feature({
        geom: new Point(this.map.getView().getCenter()),
        icon: '',
      });
      feature.setGeometryName('geom');
      this.postEditLayer.getSource().clear();
      this.postEditLayer.getSource().addFeature(feature);
      this.postFeature = feature;
    },
  },
};
</script>

<style></style>
