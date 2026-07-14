<template>
  <v-dialog v-model="show" persistent max-width="500px">
    <v-card v-if="command || editUid">
      <v-app-bar flat :color="color" height="50" dark>
        <v-icon class="mr-3">playlist_add</v-icon>
        <v-toolbar-title>{{ $t(`form.htmlPostEditor.expansionTitle`) }}</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-app-bar>
      <v-divider></v-divider>
      <v-card-text>
        <v-text-field class="mt-4" v-model="title" :label="$t('form.htmlPostEditor.expansionInputLabel')" />
      </v-card-text>

      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text color="error" @click="show = false"> {{ $t(`general.close`) }} </v-btn>
        <v-btn :disabled="!this.title" color="primary" text @click="insert"> {{ $t(`general.apply`) }} </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script>
export default {
  data() {
    return {
      title: '',
      command: null,
      editUid: null,
      show: false,
      color: this.$appConfig.app.color.primary,
    };
  },
  methods: {
    showModal(command) {
      this.clear();
      this.command = command;
      this.show = true;
    },
    showEditModal(uid, currentTitle) {
      this.clear();
      this.editUid = uid;
      this.title = currentTitle;
      this.show = true;
    },
    insert() {
      if (this.editUid) {
        this.$emit('onEditConfirm', {uid: this.editUid, title: this.title});
      } else {
        const data = {
          command: this.command,
          data: {
            title: this.title,
            uid: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          },
        };
        this.$emit('onConfirm', data);
      }
      this.show = false;
    },
    clear() {
      this.title = '';
      this.editUid = null;
      this.command = null;
    },
  },
};
</script>
