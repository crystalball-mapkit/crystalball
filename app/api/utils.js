const deepl = require('deepl-node');
const axios = require('axios');
const translator = new deepl.Translator(process.env.DEEPL_API_KEY);
const sequelize = require("./db.js");

const langVariants = { 
  "en": "en-US",
  "pt": "pt-BR"
};
const translateContent = async (language, text, key, payload, column) => {
  /**
   * language: {
   *  default: "en",
   * active: "en",
   * available: ["en", "fr", "es"]
   * }
   * text: "the text to translate"
   * key: "html" or "any other key corresponding to the column name"
   * payload: {
   * html: "the text to translate",
   * htmlTranslations: {
   * en: "the text to translate",
   * fr: "the text to translate",
   * es: "the text to translate",
   * }
   * }
   * column: {
   * default: "the text to translate",
   * translations: {
   * en: "the text to translate",
   * fr: "the text to translate",
   * es: "the text to translate",
   * }
   */
  // adds/updates the default columns 
  if (!column || !column.default) {
    const targetLanguage = langVariants[language.default] || language.default;
    const langResult = await translator.translateText(text, null, targetLanguage, {
      tagHandling: 'html',
    })
    payload[key] = langResult.text;
  } else if (language.active === language.default) {
    payload[key] = text;
  }

  let columnTranslations = column && column.translations ? column.translations : {};
  // check if it is string. If so parse it to an object
  if (typeof columnTranslations === "string") {
    columnTranslations = JSON.parse(columnTranslations);
  }
  if (!columnTranslations[language.active] && language.default !== language.active) {
    payload[`${key}Translations`][language.active] = text;
  }
  // loop through the languages in language.available and add the translations if they are not already there
  for (let i = 0; i < language.available.length; i++) {
    const lang = language.available[i];
    if (lang !== language.default) {
      const targetLanguage = langVariants[lang] || lang;
      // if the row doesn't exist in other languages
      if (lang !== language.active && !columnTranslations[lang]) {
        try {
          const langResult = await translator.translateText(text, null, targetLanguage, {
            tagHandling: 'html',
          })
          payload[`${key}Translations`][lang] = langResult.text;
        } catch (err) {
          console.log(err);
        }
      }
    }
  }

  // update the translationColumn if it exists
  if (columnTranslations[language.active]) {
    payload[`${key}Translations`][language.active] = text;
  }
}

async function refreshGeoserverCatalog(geoserverUrl, username, password) {
  try {
    const response = await axios({
      method: 'post',
      url: `${geoserverUrl}/rest/reload`,
      auth: {
        username: username,
        password: password
      }
    });

    console.log('Catalog reloaded successfully');
    return response;
  } catch (error) {
    console.error('Error reloading catalog:', error);
    throw error;
  }
}

async function addColumnIfNotExists(tableName, columnName, columnDefinition) {
  const tableDescriptions = await sequelize.getQueryInterface().describeTable(tableName);
  if (!tableDescriptions[columnName]) {
    await sequelize.getQueryInterface().addColumn(tableName, columnName, columnDefinition);
    await refreshGeoserverCatalog(process.env.GEOSERVER_URL, process.env.GEOSERVER_ADMIN_USER, process.env.GEOSERVER_ADMIN_PASSWORD)
  }
}

exports.translateContent = translateContent
exports.addColumnIfNotExists = addColumnIfNotExists;