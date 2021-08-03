"use strict";
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("_html_sidebar", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true
      },
      type: {
        type: Sequelize.STRING,
      },
      name: {
        type: Sequelize.STRING,
      },
      html: {
        type: Sequelize.TEXT,
      },
      createdBy: {
        allowNull: false,
        type: Sequelize.UUID,
        references: {
          model: '_users', // foreign key on users
          key: 'userID'
        },
      },
      updatedBy: {
        allowNull: true,
        type: Sequelize.UUID,
        references: {
          model: '_users', // foreign key on users
          key: 'userID'
        }
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable("_html_sidebar");
  },
};
