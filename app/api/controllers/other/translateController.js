const deepl = require("deepl-node");
const permissionController = require("../auth/permissionController");
const Sequelize = require('sequelize')
const sequelize = require("../../db.js");
const { translateContent, addColumnIfNotExists } = require("../../utils");
const jsdom = require("jsdom");

const translator = new deepl.Translator(process.env.DEEPL_API_KEY, {
  maxRetries: 5, minTimeout: 20000
});

const langVariants = {
  en: "en-US",
  es: "es",
  pt: "pt-BR",
};

const nonTranslatableProperties = [
  "id",
  "year",
  "amount",
  "funder",
  "start",
  "end",
  "variable1",
  "variable2",
  "strokeColor",
  "fillColor",
  "strokeWidth",
  "geom",
  "link1",
  "link2",
  "sidebarMediaTop",
  "sidebarMediaBottom",
  "translations",
];


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
        if (Array.isArray(req.body.content)) {
          res.json(result.map((r) => r.text));
        } else {
          res.json(result.text);
        }
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
        await addColumnIfNotExists(
          req.params.layer,
          'translations',
          { type: Sequelize.JSON, allowNull: true }
        )

        const response = await sequelize.query(
          `SELECT * FROM ${req.params.layer} WHERE translations IS NULL OR translations::text = '{}'::text`
        );

        const targetLanguages = Object.keys(langVariants)

        if (response[0].length > 0) {
          let partition = 0;
          let xmls = [];
          let ids = [];
          let keys = [];
          let items = {};

          for (let i = 0; i < response[0].length; i++) {
            let xml = "";
            for (let key in response[0][i]) {
              if (!nonTranslatableProperties.includes(key)) {
                if (i === 0) {
                  keys.push(key);
                }
                xml += `<e>${response[0][i][key]}</e>`;
              }
            }
            if (!xmls[partition]) {
              xmls[partition] = []
            }
            xmls[partition].push(xml);
            ids.push(response[0][i].id);
            if ((Buffer.byteLength(xmls[partition].toString()) / 1024) > 64) {
              partition += 1
            }
          }

          for (const lang of targetLanguages) {
            let translations = await translator.translateText(
              keys.map((k) => k.replace(/_/g, " ")),
              null,
              langVariants[lang],
              {
                tagHandling: "xml",
              }
            );

            keyTranslations = translations.map((t) => t.text);

            let objectKeyTranslations = {};
            for (let i = 0; i < keys.length; i++) {
              objectKeyTranslations[keys[i]] = keyTranslations[i];
            }

            let promises = xmls.map(xml =>
              translator.translateText(
                xml,
                null,
                langVariants[lang],
                {
                  tagHandling: "xml",
                }
              )
            );
            let responses = await Promise.all(promises);
            let textTranslations = [].concat(...responses);

            for (let i = 0; i < textTranslations.length; i++) {
              const dom = new jsdom.JSDOM(textTranslations[i].text);
              const elements = dom.window.document.getElementsByTagName("e");
              let item = {};
              for (let j = 0; j < elements.length; j++) {
                item[keys[j]] = elements[j].innerHTML;
              }
              item["keys"] = objectKeyTranslations;
              if (items[ids[i]]) {
                items[ids[i]][lang] = item;
              } else {
                items[ids[i]] = { [lang]: item };
              }
            }

          }
          const sqlPromises = [];
          for (const id in items) {
            sqlPromises.push(sequelize.query(
              `UPDATE ${req.params.layer} SET translations = $$${JSON.stringify(
                items[id]
              )}$$ WHERE id = $$${id}$$;`
            ));
          }
          await Promise.all(sqlPromises);
        }

        res.status(200);
        return res.json();
      } catch (err) {
        console.log("err", err);
        res.status(400);
        res.json({ error: err });
      }
    }
  });
};
