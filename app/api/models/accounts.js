const { v4: uuidv4 } = require('uuid');
'use strict';
module.exports = (sequelize, DataTypes) => {
  var Accounts = sequelize.define('_accounts', {
    accountID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: uuidv4(),
      allowNull: false,
    },
    name: DataTypes.STRING,
    planLevel: DataTypes.STRING
  });
  return Accounts;
};
