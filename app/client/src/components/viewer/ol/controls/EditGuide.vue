<template>
  <div
    v-if="
      editType &&
        highlightLayer &&
        highlightLayer.getSource().getFeatures().length == 0
    "
  >
    <v-alert dense border="left" :color="color" type="info">{{
      mobileHelpMessages[editType]
    }}</v-alert>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  props: {
    map: { type: Object, required: true },
    color: { type: String }
  },
  data() {
    return {
      mobileHelpMessages: {
        modifyAttributes: 'Tap on a feature to modify!',
        deleteFeature: 'Tap on a feature to delete!',
        addFeature: 'Tap on the map to add feature!',
        modifyFeature: 'Tap on a feature to select and then drag to modify!'
      }
    };
  },
  computed: {
    ...mapGetters('map', {
      editType: 'editType',
      highlightLayer: 'highlightLayer'
    })
  }
};
</script>

<style></style>
