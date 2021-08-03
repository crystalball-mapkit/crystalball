const { v4: uuidv4 } = require('uuid');
'use strict';
module.exports = (sequelize, DataTypes) => {
  var Logins = sequelize.define('_logins', {
    loginID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: uuidv4(),
      allowNull: false,
    },
    userName: {
      type: DataTypes.STRING(50),
      unique: true
    },
    relatedRoleID: DataTypes.INTEGER,
    passwordSalt: DataTypes.STRING,
    passwordHash: DataTypes.STRING,
    relatedUserID: DataTypes.UUID
  });
  Logins.associate = function (models) {
    models.Logins.hasOne(models.Users) // each membership has one account
  };
  return Logins;
};
