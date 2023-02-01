const permissionController = require("../auth/permissionController");
const deepl = require('deepl-node');
const translator = new deepl.Translator(process.env.DEEPL_API_KEY);

exports.translate = (req, res) => {
    if (req.body.targetLanguage === "en") { 
        req.body.targetLanguage = "en-US";
    }
    permissionController.hasPermission(req, res, "edit_html", () => {
        translator
            .translateText(req.body.content, req.body.sourceLanguage || null, req.body.targetLanguage, {
                tagHandling: req.body.tagHandling || 'html',
            })
            .then((result) => {
                res.status(200);
                res.json(result.text);
            })
            .catch((error) => {
                res.status(500);
                res.json("Couldn't translate");
            });
    });
}
