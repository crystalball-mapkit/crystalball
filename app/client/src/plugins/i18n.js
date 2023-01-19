import Vue from 'vue';
import VueI18n from 'vue-i18n';
import es from '../locales/es.json';
import en from '../locales/en.json';

Vue.use(VueI18n);

function loadLocaleMessages() {
  const languagesSorted = {
    en,
    es,
  };

  const messages = {};
  for (const language in languagesSorted) {
    if (languagesSorted.hasOwnProperty(language)) {
      messages[language] = languagesSorted[language];
    }
  }

  return messages;
}
export default new VueI18n({
  locale: navigator.language.split('-')[0] || import.meta.env.VUE_APP_I18N_LOCALE || 'en',
  fallbackLocale: import.meta.env.VUE_APP_I18N_FALLBACK_LOCALE || 'en',
  messages: loadLocaleMessages(),
});
