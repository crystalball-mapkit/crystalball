<template>
  <v-card>
    <c-jsoneditor v-model="json" :plus="false" :height="'100%'" @error="onError"></c-jsoneditor>
  </v-card>
</template>

<script>
import VJsoneditor from 'v-jsoneditor';

export default {
  components: {
    "c-jsoneditor": VJsoneditor,
  },
  data() {
    return {
      json: {},
    };
  },
  methods: {
    onError() {
      console.log('error');
    },
  },
  created() {
    this.json = this.$appConfig;
  },
};
</script>

<style>
.jsoneditor-menu {
  background-color: #00000e;
}

.jsoneditor {
  border: white;
}
</style>
