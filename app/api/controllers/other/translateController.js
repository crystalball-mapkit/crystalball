const permissionController = require("../auth/permissionController");
const sequelize = require("../../db.js");
const deepl = require("deepl-node");
const { translateContent } = require("../../utils");
const jwt = require("jsonwebtoken");
const jwtDecode = require("jwt-decode");
const { v4: uuidv4 } = require("uuid");
const translator = new deepl.Translator(process.env.DEEPL_API_KEY);

const langVariants = {
  en: "en-US",
  es: "es",
  pt: "pt-BR",
};

const languages = ["es", "pt"];

function parseXmlToJson(xml) {
  const json = {};
  for (const res of xml.matchAll(
    /(?:<(\w*)(?:\s[^>]*)*>)((?:(?!<\1).)*)(?:<\/\1>)|<(\w*)(?:\s*)*\/>/gm
  )) {
    const key = res[1] || res[3];
    const value = res[2] && parseXmlToJson(res[2]);
    json[key] = (value && Object.keys(value).length ? value : res[2]) || null;
  }
  return json;
}

exports.translate = (req, res) => {
  if (langVariants[req.body.targetLanguage]) {
    req.body.targetLanguage = langVariants[req.body.targetLanguage];
  }

  permissionController.hasPermission(req, res, "edit_html", () => {
    translator
      .translateText(
        req.body.content,
        req.body.sourceLanguage || null,
        req.body.targetLanguage,
        {
          tagHandling: req.body.tagHandling || "html",
        }
      )
      .then((result) => {
        res.status(200);
        res.json(result.text);
      })
      .catch((error) => {
        res.status(500);
        res.json("Couldn't translate");
      });
  });
};

exports.translateAllFeatures = async (req, res) => {
  permissionController.hasPermission(req, res, "edit_layers", async () => {
    if (req.params.layer) {
      try {
        const response = await sequelize.query(
          `SELECT * FROM ${req.params.layer} WHERE translations IS NULL`
        );
        if (response[0].length > 0) {
          for (const feature of response[0]) {
            let translations = {};
            let xml = "";
            for (let key in feature) {
              if (
                ![
                  "year",
                  "amount",
                  "funder",
                  "start",
                  "end",
                  "variable1",
                  "variable2",
                  "geom",
                  "translations",
                ].includes(key)
              ) {
                xml += `<${key}>${feature[key]}</${key}>`;
              }
            }
            for (const lang of languages) {
              const translation = await translator.translateText(
                xml,
                "en",
                langVariants[lang],
                {
                  tagHandling: "xml",
                }
              );
              translations[lang] = parseXmlToJson(translation.text);
            }
            await sequelize.query(
              `UPDATE ${req.params.layer} SET translations = $$${JSON.stringify(
                translations
              )}$$ WHERE id = $$${feature.id}$$;`
            );
          }
        }
        res.status(200);
        return res.json();
      } catch (err) {
        console.log("err", err);
        res.status(400);
        res.json();
      }
    }
  });
};
