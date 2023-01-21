<template>
  <div>
    <div @click="open" class="link"><slot></slot></div>
    <LightBox v-if="isOpen" :media="images" :showCaption="true" @onClosed="close"></LightBox>
  </div>
</template>
<style scoped>
div {
  display: inline;
}
</style>
<script>
import LightBox from 'vue-image-lightbox';
// see: https://www.npmjs.com/package/vue-image-lightbox

export default {
  name: 'AppLightBox',
  components: {
    LightBox,
  },
  props: {
    images: Array,
  },
  data() {
    return {
      isOpen: false,
    };
  },
  methods: {
    open() {
      this.isOpen = true;
    },
    close() {
      this.isOpen = false;
    },
  },
};
</script>
