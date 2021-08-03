const { v4: uuidv4 } = require('uuid');


"use strict";
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert(
      "_permissions",
      [
        {
          permissionID: uuidv4(),
          permissionName: "get_users",
          relatedRoleID: 1,
          resourceName: "_users",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
        {
          permissionID: uuidv4(),
          permissionName: "post_user",
          relatedRoleID: 1,
          resourceName: "_users",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
        {
          permissionID: uuidv4(),
          permissionName: "delete_user",
          relatedRoleID: 1,
          resourceName: "_users",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
        {
          permissionID: uuidv4(),
          permissionName: "patch_user",
          relatedRoleID: 1,
          resourceName: "_users",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
        {
          permissionID: uuidv4(),
          permissionName: "get_memberships",
          relatedRoleID: 1,
          resourceName: "_memberships",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
        {
          permissionID: uuidv4(),
          permissionName: "get_permissions",
          relatedRoleID: 1,
          resourceName: "_permissions",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
        {
          permissionID: uuidv4(),
          permissionName: "post_permissions",
          relatedRoleID: 1,
          resourceName: "_permissions",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
        {
          permissionID: uuidv4(),
          permissionName: "delete_permissions",
          relatedRoleID: 1,
          resourceName: "_permissions",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
        {
          permissionID: uuidv4(),
          permissionName: "get_roles",
          relatedRoleID: 1,
          resourceName: "_roles",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
        {
          permissionID: uuidv4(),
          permissionName: "patch_roles",
          relatedRoleID: 1,
          resourceName: "_roles",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
        {
          permissionID: uuidv4(),
          permissionName: "get_accounts",
          relatedRoleID: 1,
          resourceName: "_accounts",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
        {
          permissionID: uuidv4(),
          permissionName: "get_logins",
          relatedRoleID: 1,
          resourceName: "_logins",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
        {
          permissionID: uuidv4(),
          permissionName: "edit_icons",
          relatedRoleID: 1,
          resourceName: "_logins",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
        {
          permissionID: uuidv4(),
          permissionName: "edit_layers",
          relatedRoleID: 2,
          resourceName: "_layers",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
        {
          permissionID: uuidv4(),
          permissionName: "edit_html",
          relatedRoleID: 2,
          resourceName: "_layers",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
        {
          permissionID: uuidv4(),
          permissionName: "edit_layers",
          relatedRoleID: 3,
          resourceName: "_layers",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
      ],
      {}
    );
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("_permissions", null, {});
  },
};
