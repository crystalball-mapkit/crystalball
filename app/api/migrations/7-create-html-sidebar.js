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
      htmlTranslations: {
        type: Sequelize.JSON,
      },
      createdBy: {
        allowNull: true,
        type: Sequelize.UUID
      },
      updatedBy: {
        allowNull: true,
        type: Sequelize.UUID
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
