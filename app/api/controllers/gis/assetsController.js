const permissionController = require("../auth/permissionController");
const sequelize = require("../../db.js");
const HtmlSidebar = sequelize.import("../../models/html_sidebar.js");
const Icons = sequelize.import("../../models/icons.js");
const jwtDecode = require("jwt-decode");
const { v4: uuidv4 } = require('uuid');
const { translateContent } = require("../../utils.js")


exports.html_sidebar_get = (req, res) => {
  HtmlSidebar.findAll({
    raw: true,
  })
    .then((data) => {
      let response = {
        layers: {},
        groups: {},
      };
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((html) => {
          if (html.type === "layer") {
            response.layers[html.name] = html;
          }
          if (html.type === "group") {
            response.groups[html.name] = html;
          }
        });
      }
      res.status(200);
      res.json(response);
    })
    .catch((err) => {
      console.log(err);
      res.status(500);
      res.json({ err: err });
    });
};

exports.html_sidebar_post = async (req, res) => {
  permissionController.hasPermission(req, res, "edit_html", async () => {
    const decodedToken = jwtDecode(req.headers.authorization);
    const uploaderId = decodedToken.user.userID;
    const payload = {
      id: uuidv4(),
      type: req.body.type,
      name: req.body.name,
      html: req.body.html,
      createdBy: uploaderId,
      htmlTranslations: {}
    };
    if (req.body.language) {
      await translateContent(req.body.language, req.body.html, "html", payload, null);
    }

    HtmlSidebar.create(payload)
      .then(() => {
        res.status(200);
        return res.json(payload);
      })
      .catch((err) => {
        console.log(err);
        res.status(500);
        res.json();
      });
  });
};
exports.html_sidebar_patch = async (req, res) => {
  permissionController.hasPermission(req, res, "edit_html", async () => {
    const decodedToken = jwtDecode(req.headers.authorization);
    const userID = decodedToken.user.userID;

    // get the row to update
    const row = await HtmlSidebar.findOne({
      where: {
        name: req.body.name,
      },
    })

    // update the row
    const updatePayload = {
      updatedBy: userID,
      htmlTranslations: {
        ...row.htmlTranslations || {},
      }
    }
    if (req.body.language) {
      await translateContent(req.body.language, req.body.html, "html", updatePayload, {
        default: row.html,
        translations: row.htmlTranslations || {},
      });
    }
    HtmlSidebar.update(
      updatePayload,
      {
        where: {
          name: req.body.name,
        },
      }
    )
      .then(() => {
        res.status(200);
        return res.json(updatePayload);
      })
      .catch((err) => {
        console.log(err);
        res.status(500);
        res.json();
      });
  });
};

exports.html_sidebar_delete = (req, res) => {
  permissionController.hasPermission(req, res, "edit_html", () => {
    if (req.body.name) {
      HtmlSidebar.destroy({
        where: {
          name: req.body.name,
        },
      })
        .then((deleted) => {
          res.status(204);
          res.json();
        })
        .catch((err) => {
          console.log(err);
          res.status(500);
          res.json();
        });
    } else {
      res.status(400);
      res.json();
    }
  });
};

/** ICONS ENDPOINT */

exports.icons_get = (req, res) => {
  Icons.findAll({
    raw: true,
  })
    .then((data) => {
      res.status(200);
      res.json(data);
    })
    .catch((err) => {
      console.log(err);
      res.status(500);
      res.json({ err: err });
    });
};

exports.icons_post = (req, res) => {
  permissionController.hasPermission(req, res, "edit_icons", () => {
    const decodedToken = jwtDecode(req.headers.authorization);
    const uploaderId = decodedToken.user.userID;
    const payload = {
      id: uuidv4(),
      group: req.body.group,
      iconUrl: req.body.iconUrl,
      title: req.body.title,
      createdBy: uploaderId,
    };
    Icons.create(payload)
      .then(() => {
        res.status(200);
        res.json("Icon added successfully!")
      })
      .catch((err) => {
        console.log(err);
        res.status(500);
        res.json();
      });
  });
};


exports.icons_patch = (req, res) => {
  permissionController.hasPermission(req, res, "edit_icons", () => {
    Icons.update(
      {
        iconUrl: req.body.iconUrl,
        title: req.body.title,
        group: req.body.group
      },
      {
        where: {
          id: req.body.id,
        },
      }
    )
      .then(() => {
        // Update all html posts containing the previous icon
        let sql = `UPDATE html_posts SET icon = $$${req.body.iconUrl}$$, title = $$${req.body.title}$$, "group" = $$${req.body.group}$$ WHERE icon = $$${req.body.previousIconUrl}$$;`;
        sequelize
          .query(sql)
          .then(() => {
            res.json("Icons and posts updated successfuly!")
            res.status(200);
          })
          .catch((err) => {
            console.log(err);
            res.status(500);
            res.json({ err: err });
          });
      })
      .catch((err) => {
        console.log(err);
        res.status(500);
        res.json();
      });
  });
};


exports.icons_delete = (req, res) => {
  permissionController.hasPermission(req, res, "edit_icons", () => {
    if (req.params.id) {
      Icons.destroy({
        where: {
          id: req.params.id,
        },
      })
        .then((deleted) => {
          res.status(204);
          res.json();
        })
        .catch((err) => {
          console.log(err);
          res.status(500);
          res.json();
        });
    } else {
      res.status(400);
      res.json();
    }
  });
};

exports.icons_count_posts = (req, res) => {
  permissionController.hasPermission(req, res, "edit_icons", () => {
    if (req.body.iconUrl) {
      let sql = `SELECT Count(*) FROM html_posts WHERE icon = $$${req.body.iconUrl}$$;`;
      sequelize
        .query(sql)
        .then((response) => {
          res.json(response[0][0])
          res.status(200);
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
}

exports.icons_replace_posts = (req, res) => {
  permissionController.hasPermission(req, res, "edit_icons", () => {
    if (req.body.iconUrl && req.body.title && req.body.group && req.body.previousIconUrl) {
      // Update all html posts containing the previous icon
      let sql = `UPDATE html_posts SET icon = $$${req.body.iconUrl}$$, title = $$${req.body.title}$$, "group" = $$${req.body.group}$$ WHERE icon = $$${req.body.previousIconUrl}$$;`;
      sequelize
        .query(sql)
        .then(() => {
          res.json("Post Icons updated successfuly!")
          res.status(200);
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
}