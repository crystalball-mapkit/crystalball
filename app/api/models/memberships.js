const { v4: uuidv4 } = require('uuid');
'use strict';
module.exports = (sequelize, DataTypes) => {
  var Memberships = sequelize.define('_memberships', {
    membershipID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: uuidv4(),
      allowNull: false,
    },
    relatedUserID: DataTypes.UUID,
    relatedAccountID: DataTypes.UUID,
    membershipEmailAddress: DataTypes.STRING
  });
  Memberships.associate = function (models) {
    models.Memberships.hasOne(models.Accounts) // each membership has one account
    models.Memberships.hasOne(models.Users) // one user per membership
    models.Memberships.hasOne(models.Roles) //  each membership acts as a group, each of which corresponds to a role w/ permissions
  };
  return Memberships;
};
