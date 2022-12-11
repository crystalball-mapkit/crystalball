<template>
  <v-dialog v-model="show" max-width="355px">
    <div v-if="serverConfig.usersOpenRegistration && serverConfig.usersOpenRegistration === 'False'">
      <v-app-bar flat :color="color" height="50" dark>
        <v-spacer></v-spacer>
        <v-toolbar-title>Sign In</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-app-bar>
      <v-card flat>
        <v-divider></v-divider>
        <v-progress-linear :active="loading" indeterminate :color="color"></v-progress-linear>
        <v-alert class="ma-2" outlined v-if="error" type="error">
          {{ error }}
        </v-alert>
        <v-card-text class="mt-5">
          <v-form @keyup.native.enter="handleLogin" @submit.prevent="handleLogin" v-model="validLogin" lazy-validation>
            <v-text-field
              v-model="user.username"
              prepend-icon="person"
              name="username"
              label="Username"
              type="text"
              :rules="[rules.required]"
              :disabled="loading"
            ></v-text-field>
            <v-text-field
              v-model="user.password"
              prepend-icon="lock"
              name="password"
              :append-icon="value ? 'visibility' : 'visibility_off'"
              @click:append="() => (value = !value)"
              :type="value ? 'password' : 'text'"
              :rules="[rules.required]"
              label="Password"
              required
              :disabled="loading"
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn :disabled="loading || !validLogin" class="white--text" @click="handleLogin" :color="color">
            <v-icon small left>fas fa-sign-in-alt</v-icon> Login</v-btn
          >
          <v-spacer></v-spacer>
        </v-card-actions>
      </v-card>
    </div>
    <v-tabs v-else v-model="tab" show-arrows :background-color="color" icons-and-text dark grow>
      <v-tabs-slider color="purple darken-4"></v-tabs-slider>
      <v-tab @click="changeTab" v-for="(i, index) in tabs" :key="index">
        <v-icon>{{ i.icon }}</v-icon>
        <div class="caption py-1">{{ i.name }}</div>
      </v-tab>
      <v-tab-item>
        <v-card flat>
          <v-divider></v-divider>
          <v-progress-linear :active="loading" indeterminate :color="color"></v-progress-linear>
          <v-alert class="ma-2" outlined v-if="error" type="error">
            {{ error }}
          </v-alert>
          <v-card-text class="mt-5">
            <v-form
              @keyup.native.enter="handleLogin"
              @submit.prevent="handleLogin"
              v-model="validLogin"
              lazy-validation
            >
              <v-text-field
                v-model="user.username"
                prepend-icon="person"
                name="username"
                label="Username"
                type="text"
                :rules="[rules.required]"
                :disabled="loading"
              ></v-text-field>
              <v-text-field
                v-model="user.password"
                prepend-icon="lock"
                name="password"
                :append-icon="value ? 'visibility' : 'visibility_off'"
                @click:append="() => (value = !value)"
                :type="value ? 'password' : 'text'"
                :rules="[rules.required]"
                label="Password"
                required
                :disabled="loading"
              ></v-text-field>
            </v-form>
          </v-card-text>
          <v-divider></v-divider>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn :disabled="loading || !validLogin" class="white--text" @click="handleLogin" :color="color">
              <v-icon small left>fas fa-sign-in-alt</v-icon> Login</v-btn
            >
            <v-spacer></v-spacer>
          </v-card-actions>
        </v-card>
      </v-tab-item>
      <v-tab-item>
        <v-card flat>
          <v-divider></v-divider>
          <v-progress-linear :active="loading" indeterminate :color="color"></v-progress-linear>
          <v-alert class="ma-2" outlined v-if="error" type="error">
            {{ error }}
          </v-alert>
          <v-card-text>
            <v-form ref="registerForm" v-model="validRegister" lazy-validation>
              <v-row>
                <v-col cols="12" sm="6" md="6">
                  <v-text-field
                    v-model="guestUser.firstName"
                    :rules="[rules.required]"
                    label="First Name"
                    maxlength="20"
                    required
                  ></v-text-field>
                </v-col>
                <v-col cols="12" sm="6" md="6">
                  <v-text-field
                    v-model="guestUser.lastName"
                    :rules="[rules.required]"
                    label="Last Name"
                    maxlength="20"
                    required
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field v-model="guestUser.email" :rules="emailRules" label="E-mail" required></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="guestUser.password"
                    :append-icon="show1 ? 'mdi-eye' : 'mdi-eye-off'"
                    :rules="[rules.required, rules.min]"
                    :type="show1 ? 'text' : 'password'"
                    name="input-10-1"
                    label="Password"
                    hint="At least 8 characters"
                    counter
                    @click:append="show1 = !show1"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    block
                    v-model="verify"
                    :append-icon="show1 ? 'mdi-eye' : 'mdi-eye-off'"
                    :rules="[rules.required, passwordMatch]"
                    :type="show1 ? 'text' : 'password'"
                    name="input-10-1"
                    label="Confirm Password"
                    counter
                    @click:append="show1 = !show1"
                  ></v-text-field>
                </v-col>
                <v-spacer></v-spacer>
              </v-row>
            </v-form>
          </v-card-text>
          <v-divider></v-divider>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              :disabled="loading || !validRegister"
              class="white--text"
              @click="validateRegisterForm"
              :color="color"
            >
              <v-icon small left>fa-user-plus</v-icon> Register</v-btn
            >
            <v-spacer></v-spacer>
          </v-card-actions>
        </v-card>
      </v-tab-item>
    </v-tabs>
  </v-dialog>
</template>
<script>
import {mapMutations, mapGetters} from 'vuex';
import User from '../../models/user';

export default {
  data: () => ({
    tab: 0,
    tabs: [
      {name: 'Login', icon: 'fas fa-sign-in-alt'},
      {name: 'Register', icon: 'fa-user-plus'},
    ],
    user: new User(),
    guestUser: new User(),
    validLogin: true,
    validRegister: true,
    loading: false,
    error: '',
    value: String,
    verify: '',
    show1: false,
    rules: {
      required: value => !!value || 'Required.',
      min: v => (v && v.length >= 8) || 'Min 8 characters',
    },
    emailRules: [v => !!v || 'Required', v => /.+@.+\..+/.test(v) || 'E-mail must be valid'],
  }),
  props: ['visible', 'color'],

  computed: {
    show: {
      get() {
        return this.visible;
      },
      set(value) {
        if (!value) {
          this.$emit('close');
          // Clear form and set tab index to login
          this.user = new User();
          this.guestUser = new User();
          this.tab = 0;
        }
      },
    },
    passwordMatch() {
      return () => this.guestUser.password === this.verify || 'Password must match';
    },
    ...mapGetters('app', {
      serverConfig: 'serverConfig',
    }),
  },
  methods: {
    ...mapMutations('map', {
      toggleSnackbar: 'TOGGLE_SNACKBAR',
    }),
    validateRegisterForm() {
      if (this.$refs.registerForm.validate()) {
        this.handleRegister();
      }
    },
    reset() {
      this.$refs.form.reset();
    },
    resetValidation() {
      this.$refs.form.resetValidation();
    },

    handleLogin() {
      if (!this.validLogin) {
        this.loading = false;
        return;
      }
      this.error = '';
      this.loading = true;
      this.$store.dispatch('auth/login', this.user).then(
        () => {
          this.clear();
        },
        error => {
          this.loading = false;
          this.error =
            error.response && error.response.data && error.response.data.err
              ? error.response.data.err
              : "Can't login in with provider credentials";
        }
      );
    },
    handleRegister() {
      if (!this.validRegister) {
        this.loading = false;
        return;
      }
      this.error = '';
      this.loading = true;
      this.$store.dispatch('auth/registerGuestUser', this.guestUser).then(
        response => {
          this.clear();
          this.toggleSnackbar({
            type: 'success',
            message: 'Guest user created successfully',
            state: true,
            timeout: 2000,
          });
          if (response.token) {
            localStorage.setItem('token', JSON.stringify(response.token));
            this.$store.commit('auth/loginSuccess', response);
          }
        },
        error => {
          this.loading = false;
          this.error =
            error.response && error.response.data && error.response.data[0] && error.response.data[0].msg
              ? error.response.data[0].msg
              : 'Cannot register as guest!';
        }
      );
    },
    changeTab() {
      this.loading = false;
      this.error = '';
    },
    clear() {
      this.loading = false;
      this.error = '';
      this.$emit('close');
    },
  },
};
</script>

<style scoped>
.v-card__text,
.v-card__title {
  word-break: normal !important;
}
</style>
