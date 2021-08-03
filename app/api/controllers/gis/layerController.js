const permissionController = require("../auth/permissionController");
const sequelize = require("../../db.js");

const upload = require("../../services/file-upload");
const singleUpload = upload.single("image");
const jwtDecode = require("jwt-decode");
const { v4: uuidv4 } = require('uuid');
const moment = require("moment");


exports.layer_post = async (req, res) => {
  permissionController.hasPermission(req, res, "edit_layers", async () => {
    const decodedToken = jwtDecode(req.headers.authorization);
    // Prevent sql injection
    singleUpload(req, res, async function (err) {
      const payload = JSON.parse(req.body.payload);
      // Restrict update/delete/insert of all other layers on guest users.
      if (!decodedToken.roles.includes('guest_user') && payload.table !== "html_posts") {
        res.status(401);
        res.json("Action is not allowed for this user role!")
      }
      // Restrict update and delete of html_post to their own posts for guest and regular users.
      if (!decodedToken.roles.includes("admin_user") &&
        ["update", "delete"].includes(payload.type) &&
        payload.table === "html_posts" &&
        payload.properties.createdBy !== decodedToken.user.userID) {
        const feature = await sequelize.query(`SELECT "createdBy" FROM html_posts WHERE id=$$${payload.featureId.split(".")[1]}$$`);
        if (feature && feature[0] && feature[0].createdBy && feature[0].createdBy != decodedToken.user.userID) {
          res.status(401);
          res.json("Action is not allowed for this user role!")
        }
      }
      if (
        req.file &&
        req.file.location &&
        payload.hasOwnProperty("sidebarPosition")
      ) {
        payload.properties[payload.sidebarPosition] = process.env
          .AWS_CLOUDFRONT_URL
          ? process.env.AWS_CLOUDFRONT_URL + req.file.key.replace("assets", "")
          : process.file.location;
      }
      if (payload.table.charAt(0) === "_") {
        res.status(500);
        res.json({ err: "Sql injection detected" });
      }
      let geometry, featureId;
      if (payload.geometry) {
        geometry = `ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(
          payload.geometry
        )}'), ${payload.srid})`;
      }
      if (payload.featureId) {
        if (typeof payload.featureId === "string") {
          featureId = payload.featureId.split(".")[1];
          // Edge case for other  layers that don't have a uuid as PK 
          if (!["html_posts"].includes(payload.table)) {
            featureId = parseInt(featureId);
          } else {
            featureId = `$$${featureId}$$`
          }
        }
      }


      if (payload.type) {
        let sql = ``;
        switch (payload.type) {
          case "insert": {
            if (payload.properties.hasOwnProperty("createdBy")) {
              payload.properties.createdBy = decodedToken.user.userID;
            }
            if (["html_posts"].includes(payload.table)) {
              payload.properties.id = uuidv4();
            }
            // For html_posts and every layer that has createdAt props and isn't defined in sequelize model createdBy has to be added manually
            if (payload.properties.hasOwnProperty("createdAt")) {
              payload.properties.createdAt = moment().format("YYYY-MM-DD HH:mm:ss")
            }
            // Delete updatedBy and updatedAt 
            delete payload.properties["updatedBy"];
            delete payload.properties["updatedAt"];
            const keys = [];
            const values = [];
            if (payload.geometry) {
              keys.push("geom");
              values.push(geometry);
            }
            if (payload.properties) {
              Object.keys(payload.properties).forEach((key) => {
                keys.push(`"${key}"`);
                let value = payload.properties[key];
                if (typeof value === "string") {
                  value = `$$${value}$$`;
                } else if (typeof value === "object") {
                  value = `$$${JSON.stringify(value)}$$`;
                }
                values.push(value);
              });
            }
            sql = `insert into ${payload.table
              } (${keys.join()}) values (${values.join()})`;
            break;
          }
          case "update": {
            if (payload.properties.hasOwnProperty("updatedBy")) {
              payload.properties.updatedBy = decodedToken.user.userID;
            }
            let keyValue = "";
            if (payload.properties) {
              if (payload.properties.hasOwnProperty("updatedAt")) {
                payload.properties.updatedAt = moment().format("YYYY-MM-DD HH:mm:ss")
              }
              // Exclude CreatedBy and CreateAt from update. 
              delete payload.properties["createdBy"];
              delete payload.properties["createdAt"]

              Object.keys(payload.properties).forEach((key, index, array) => {
                let value = payload.properties[key];
                if (value !== null) {
                  if (typeof value === "string") {
                    value = `$$${value}$$`;
                  } else if (typeof value === "object") {
                    value = `$$${JSON.stringify(value)}$$`;
                  }
                }
                keyValue += `"${key}" = ${value}`;
                if (index !== array.length - 1) {
                  keyValue += ",";
                } else {
                  if (geometry) {
                    keyValue += `,"geom" = ${geometry}`;
                  }
                }

              });
            }
            sql = `update ${payload.table} SET ${keyValue} where ${payload.table}.id = ${featureId}`;
            break;
          }
          case "delete": {
            if (featureId) {
              sql = `DELETE FROM ${payload.table} WHERE id = ${featureId};`;
            }
            break;
          }
          default:
            break;
        }
        sequelize
          .query(sql)
          .then((results) => {
            res.status(200);
            res.json(results);
          })
          .catch((err) => {
            console.log(err);
            res.status(500);
            res.json({ err: err });
          });
      } else {
        res.status(400);
        res.json();
      }
    });
  });
};
