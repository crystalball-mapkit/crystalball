<template>
  <v-row justify="center">
    <v-dialog v-model="dialog" persistent max-width="600px">
      <v-card>
        <v-app-bar dark :color="color" dense flat>
          <v-app-bar-nav-icon
            ><v-icon>{{ options.icon }}</v-icon></v-app-bar-nav-icon
          >
          <v-toolbar-title class="white--text">{{ title }}</v-toolbar-title>
        </v-app-bar>
        <v-card-text>
          <v-container>
            <v-form v-if="['new', 'update'].includes(mode)" ref="userForm" v-model="valid">
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="user.firstName"
                    :label="$t(`form.user.firstName`) + `*`"
                    prepend-icon="person"
                    :rules="[rules.required]"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="user.lastName"
                    :label="$t(`form.user.lastName`) + `*`"
                    prepend-icon="person"
                    :rules="[rules.required]"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="user.email"
                    :label="$t(`form.user.email`) + `*`"
                    prepend-icon="email"
                    :rules="[rules.required, rules.email]"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-if="mode === 'new'"
                    v-model="user.password"
                    :label="$t(`form.user.password`) + `*`"
                    prepend-icon="lock"
                    type="password"
                    :rules="[rules.required, rules.password, rules.passwordNumber]"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-if="mode === 'new'"
                    v-model="confirmPassword"
                    :label="$t(`form.user.confirmPassword`) + `*`"
                    prepend-icon="lock"
                    type="password"
                    :rules="[rules.required, passwordConfirmationRule]"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-select
                    prepend-icon="supervisor_account"
                    v-model="user.relatedRoleID"
                    :items="roleItems"
                    item-text="display"
                    item-value="value"
                    :label="$t(`form.user.role`) + `*`"
                    :rules="[rules.required]"
                  ></v-select>
                </v-col>
              </v-row>
            </v-form>
            <v-form v-model="valid" v-if="mode === 'updatePassword'" ref="updatePassword">
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    v-model="user.password"
                    :label="$t(`dashboard.newPassword`)"
                    prepend-icon="lock"
                    type="password"
                    :rules="[rules.required, rules.password, rules.passwordNumber]"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="confirmPassword"
                    :label="$t(`dashboard.confirmPassword`)"
                    prepend-icon="lock"
                    type="password"
                    :rules="[rules.required, passwordConfirmationRule]"
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-form>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn :disabled="valid === false" color="blue darken-1" text @click="save">{{ $t(`general.save`) }}</v-btn>
          <v-btn color="red darken-1" text @click="cancel">{{ $t(`general.close`) }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>
<script>
import {mapMutations} from 'vuex';
import User from '../../models/user';
import UserUpdateDTO from '../../models/userUpdateDTO';

export default {
  data: () => ({
    user: new User(),
    confirmPassword: '',
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
      icon: 'person',
      zIndex: 200,
    },
    roleItems: [
      {value: 1, display: 'Admin User'},
      {value: 2, display: 'Regular User'},
      {value: 3, display: 'Guest User'},
    ],
    rules: {
      required: value => !!value || 'Required.',
      password: value => (value && value.length >= 8) || 'minimum 8 characters',
      passwordNumber: v => /(?=.*\d)/.test(v) || 'Must have one number',
      email: value => /.+@.+/.test(value) || 'E-mail must be valid',
    },
  }),
  props: {
    color: {type: String},
  },
  methods: {
    open(mode, title, confirmText, cancelText, options, user) {
      this.mode = mode;
      if (user) {
        this.user = new UserUpdateDTO(
          user.userID,
          user.userName,
          user.email,
          user.firstName,
          user.lastName,
          user.relatedRoleID
        );
      }
      this.dialog = true;
      this.title = title;
      this.confirmText = confirmText;
      this.cancelText = cancelText;
      this.options = Object.assign(this.options, options);
    },
    save() {
      let api = '';
      let messageSuccess = '';
      let messageError = '';
      this.user.username = this.user.email;
      if (this.mode == 'new') {
        api = 'registerUser';
        messageSuccess = this.$t(`dashboard.userCreatedSuccess`);
        messageError = this.$t(`dashboard.userCreatedFailed`);
      } else if (this.mode == 'update') {
        api = 'updateUser';
        messageSuccess = this.$t(`dashboard.userUpdatedSuccess`);
        messageError = this.$t(`dashboard.userUpdatedFailed`);
      } else if (this.mode == 'updatePassword') {
        api = 'updatePassword';
        messageSuccess = this.$t(`dashboard.passwordUpdatedSuccess`);
        messageError = this.$t(`dashboard.passwordUpdatedFailed`);
      }

      this.$store.dispatch(`auth/${api}`, this.user).then(
        () => {
          this.toggleSnackbar({
            type: 'success',
            message: messageSuccess,
            state: true,
            timeout: 2000,
          });
          this.$store.dispatch('auth/getUsers');
        },
        () => {
          this.toggleSnackbar({
            type: 'error',
            message: messageError,
            state: true,
            timeout: 2000,
          });
        }
      );

      this.cancel();
    },
    cancel() {
      this.user = new User();
      this.confirmPassword = '';
      if (this.$refs.userForm) {
        this.$refs.userForm.reset();
      }
      if (this.$refs.updatePassword) {
        this.$refs.updatePassword.reset();
      }

      this.dialog = false;
    },
    ...mapMutations('map', {
      toggleSnackbar: 'TOGGLE_SNACKBAR',
    }),
  },
  computed: {
    passwordConfirmationRule() {
      return () => this.user.password === this.confirmPassword || this.$t(`dashboard.passwordNotMatch`);
    },
  },
};
</script>
