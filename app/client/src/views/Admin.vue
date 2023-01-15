<template>
  <v-app
    id="inspire"
    :style="`font-family:${
      $appConfig.app.font && $appConfig.app.font.family ? $appConfig.app.font.family : 'Roboto'
    }, 'Roboto', serif;`"
  >
    <v-navigation-drawer v-model="drawer" app clipped>
      <v-list dense>
        <div :key="item.text" v-for="item in items">
          <v-list-item :to="item.to" :exact="true">
            <v-list-item-action>
              <v-icon>{{ item.icon }}</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>
                {{ item.text }}
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </div>
      </v-list>

      <v-list dense> </v-list>
    </v-navigation-drawer>

    <v-app-bar app clipped-left :color="$appConfig.app.color.primary" dark dense>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title class="mr-12 align-center">
        <span class="title">Admin Dashboard</span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-menu offset-y>
        <template v-slot:activator="{on, attrs}">
          <v-btn class="mr-4" v-bind="attrs" v-on="on" icon>
            <country-flag
              :country="currentLanguage === 'en' ? 'us' : currentLanguage"
              size="normal"
              :rounded="true"
              class="mt-0 pt-0"
            />
          </v-btn>
        </template>
        <v-list dense>
          <v-list-item v-for="language in availableLanguages" :key="language.code" @click="switchLocale(language.code)">
            <v-list-item-icon style="margin-top: 0px; margin-right: 5px">
              <country-flag
                :country="language.code === 'en' ? 'usa' : language.code"
                size="normal"
                :rounded="true"
                class="mt-0 pt-0"
              />
            </v-list-item-icon>
            <v-list-item-title>{{ language.value }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
      <!-- USER INFO AND LOGOUT (AUTHENTICATED)-->
      <template v-if="loggedUser">
        <v-menu origin="center center" offset-y :nudge-bottom="10" transition="scale-transition">
          <template v-slot:activator="{on, attrs}">
            <v-btn small rounded :color="$appConfig.app.color.secondary" class="elevation-0" v-on="on" v-bind="attrs"
              ><v-icon left>person</v-icon> {{ `${loggedUser.user.firstName} ${loggedUser.user.lastName}     ` }}</v-btn
            >
          </template>

          <v-list dense>
            <v-list-item
              v-if="Array.isArray(loggedUser.roles) && loggedUser.roles.includes('admin_user')"
              @click="goToMap"
            >
              <v-list-item-icon>
                <v-icon>map</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>Map</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
            <v-list-item @click="logOut">
              <v-list-item-icon>
                <v-icon>exit_to_app</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>Logout</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-menu>
      </template>
    </v-app-bar>

    <v-content dark>
      <v-container dark>
        <v-row align="start">
          <v-col>
            <router-view></router-view>
          </v-col>
        </v-row>
      </v-container>
    </v-content>

    <snackbar />
  </v-app>
</template>

<script>
import {mapGetters} from 'vuex';
import Snackbar from '../components/core/Snackbar.vue';

export default {
  props: {
    source: String,
  },
  components: {
    Snackbar,
  },
  data: () => ({
    drawer: null,
    items: [
      {icon: 'dashboard', text: 'Dashboard', to: {name: 'admin.dashboard'}},
      {icon: 'person', text: 'User', to: {name: 'admin.users'}},
      {
        icon: 'mdi-chart-bubble',
        text: 'Assets',
        to: {name: 'admin.assets'},
      },
      {icon: 'settings', text: 'Settings', to: {name: 'admin.settings'}},
    ],
    languageCodes: {
      en: 'English',
      de: 'Deutsch',
      fr: 'Français',
      es: 'Español',
      pt: 'Português',
      ru: 'Русский',
      ar: 'العربية',
      zh: '中文',
    },
  }),
  methods: {
    goToMap() {
      this.$router.push({name: 'map'});
    },
    logOut() {
      this.$store.dispatch('auth/logout');
      this.goToMap();
    },
    switchLocale(locale) {
      if (this.$i18n.locale !== locale) {
        this.$i18n.locale = locale;
      }
    },
  },

  computed: {
    ...mapGetters('auth', {
      loggedUser: 'loggedUser',
    }),
    currentLanguage() {
      let countryCode = this.$i18n.locale;
      if (countryCode.includes('-')) {
        countryCode = countryCode.split('-')[0];
      }
      return countryCode;
    },
    availableLanguages() {
      const availableLanguages = this.$i18n.availableLocales;
      const currentLanguage = this.currentLanguage;
      const languages = availableLanguages.filter(code => code !== currentLanguage);
      return languages.map(language => ({
        code: language || 'en',
        value: this.languageCodes[language] || 'English',
      }));
    },
  },
};
</script>
