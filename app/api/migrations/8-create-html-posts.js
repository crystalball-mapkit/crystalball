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
      group: {
        type: Sequelize.STRING,
      },
      html: {
        type: Sequelize.TEXT,
      },
      geom: {
        type: Sequelize.GEOMETRY("POINT", 4326),
      },
      createdBy: {
        allowNull: false,
        type: Sequelize.UUID,
        references: {
          model: '_users', // foreign key on users
          key: 'userID'
        }
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
