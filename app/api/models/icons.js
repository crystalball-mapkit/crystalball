const { v4: uuidv4 } = require('uuid');
"use strict";
module.exports = (sequelize, DataTypes) => {
  var _icons = sequelize.define(
    "_icons",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: uuidv4(),
        allowNull: false,
      },
      group: DataTypes.STRING,
      title: DataTypes.STRING,
      iconUrl: DataTypes.STRING,
      createdBy: DataTypes.UUID
    },
    { freezeTableName: true }
  );
  _icons.associate = function (models) {
    models._icons.hasOne(models.Users) // each membership has one account
  };
  return _icons;
};
