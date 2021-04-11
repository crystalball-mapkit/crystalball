const permissionController = require("../auth/permissionController");
const upload = require("../../services/file-upload");

const singleUpload = upload.single("file");
exports.file_upload = (req, res) => {
  permissionController.hasPermission(req, res, "edit_layers", () => {
    singleUpload(req, res, function (err) {
      if (err) {
        return res.status(422).send({
          errors: [{ title: "File Upload Error", detail: err.message }],
        });
      }

      const fileUrl = process.env.AWS_CLOUDFRONT_URL
        ? process.env.AWS_CLOUDFRONT_URL +
          req.file.key.replace("assets", "")
        : process.file.location;
        
      return res.json({ fileUrl });
    });
  });
};
