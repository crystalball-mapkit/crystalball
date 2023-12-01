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

async function refreshGeoserverFeatureType(geoserverUrl, workspace, datastore, featureType, username, password) {
  const url = `${geoserverUrl}/rest/workspaces/${workspace}/datastores/${datastore}/featuretypes/${featureType}.json`;
  try {
    // Make a GET request to get the current feature type configuration
    const response = await axios.get(url, {
      auth: {
        username: username,
        password: password
      }
    });

    // Make a PUT request to update the feature type configuration
    await axios.put(url, response.data, {
      auth: {
        username: username,
        password: password
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Feature type reloaded successfully');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

async function addColumnIfNotExists(tableName, columnName, columnDefinition) {
  const tableDescriptions = await sequelize.getQueryInterface().describeTable(tableName);
  if (!tableDescriptions[columnName]) {
    await sequelize.getQueryInterface().addColumn(tableName, columnName, columnDefinition);
  }
}

exports.translateContent = translateContent
exports.addColumnIfNotExists = addColumnIfNotExists;