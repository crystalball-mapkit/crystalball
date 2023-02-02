"use strict";
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("html_posts", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      icon: {
        type: Sequelize.STRING,
      },
      title: {
        type: Sequelize.STRING,
      },
      titleTranslations: {
        type: Sequelize.JSON,
      },
      group: {
        type: Sequelize.STRING,
      },
      html: {
        type: Sequelize.TEXT,
      },
      htmlTranslations: {
        type: Sequelize.JSON,
      },
      geom: {
        type: Sequelize.GEOMETRY("POINT", 4326),
      },
      createdBy: {
        allowNull: false,
        type: Sequelize.UUID
      },
      updatedBy: {
        allowNull: true,
        type: Sequelize.UUID
      },
      createdAt: {
        allowNull: true,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: true,
        type: Sequelize.DATE,
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable("html_posts");
  },
};
