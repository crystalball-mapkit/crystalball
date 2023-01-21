<template>
  <div id="app">
    <keep-alive>
      <router-view />
    </keep-alive>
  </div>
</template>
<script>
export default {
  name: 'App',
  beforeCreate() {
    if (this.$appConfig.app.font && this.$appConfig.app.font.url) {
      const link = document.createElement('link');
      link.href = `${this.$appConfig.app.font.url}`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  },
};
</script>
