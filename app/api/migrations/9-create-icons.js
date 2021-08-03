"use strict";
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("_icons", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      group: {
        type: Sequelize.STRING
      },
      title: {
        type: Sequelize.STRING,
      },
      iconUrl: {
        type: Sequelize.STRING,
      },
      createdBy: {
        allowNull: false,
        type: Sequelize.UUID,
        references: {
          model: '_users', // foreign key on users
          key: 'userID'
        },
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: true,
        type: Sequelize.DATE,
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable("_icons");
  },
};
