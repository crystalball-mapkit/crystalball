const { v4: uuidv4 } = require('uuid');
"use strict";
module.exports = (sequelize, DataTypes) => {
  var _html_sidebar = sequelize.define(
    "_html_sidebar",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: uuidv4(),
        allowNull: false,
      },
      type: DataTypes.STRING,
      name: DataTypes.STRING,
      html: DataTypes.TEXT,
      htmlTranslations: DataTypes.JSON,
      createdBy: DataTypes.UUID,
      updatedBy: DataTypes.UUID
    },
    { freezeTableName: true }
  );
  _html_sidebar.associate = function (models) {
    models._html_sidebar.hasOne(models.Users) // each membership has one account
  };
  return _html_sidebar;
};
