const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
var path = require("path");

aws.config.update({
  secretAccessKey: process.env.S3_SECRET_KEY,
  accessKeyId: process.env.S3_ACCESS_KEY,
  region: process.env.S3_REGION,
});

const s3 = new aws.S3();
const jwtDecode = require("jwt-decode");

const fileFilter = (req, file, cb) => {
  console.log(file.mimetype);
  if (
    ["audio/wav", "audio/mpeg", "image/jpeg", "image/png"].includes(
      file.mimetype
    )
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid Mime Type, only JPEG, PNG, MP3 and WAV"), false);
  }
};

const upload = multer({
  fileFilter,
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET,
    acl: "public-read",
    metadata: function (req, file, cb) {
      const decodedToken = jwtDecode(req.headers.authorization);
      const uploaderFullName = `${decodedToken.user.firstName} ${decodedToken.user.lastName}`;
      const uploaderId = decodedToken.user.userID.toString();
      cb(null, { uploaderFullName, uploaderId });
    },
    key: function (req, file, cb) {
      let assetSubfolder = "";
      if (req.body.folder) {
        assetSubfolder = `${req.body.folder}/`
      }
      else if (["image/jpeg", "image/png"].includes(file.mimetype)) {
        assetSubfolder = "images/";
      } else if (["audio/wav", "audio/mpeg"].includes(file.mimetype)) {
        assetSubfolder = "audios/";
      } else {
        cb(new Error("Invalid Mime Type, only JPEG, PNG, MP3 and WAV"), false);
      }
      const path = "assets/" + assetSubfolder + Date.now() + "_" + file.originalname;
      console.log(path);
      cb(null, path); //Appending extension
    },
  }),
});

module.exports = upload;
