const { v4: uuidv4 } = require('uuid');
'use strict';
module.exports = (sequelize, DataTypes) => {
  var Permissions = sequelize.define('_permissions', {
    permissionID: {
      type: DataTypes.UUID,
      primaryKey: true,
      autoIncrement: true,
      defaultValue: uuidv4(),
    },
    relatedRoleID: {
      type: DataTypes.INTEGER
    },
    permissionName: {
      type: DataTypes.STRING
    },
    resourceName: DataTypes.STRING
  });
  return Permissions;
};
