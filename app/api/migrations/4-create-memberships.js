'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('_memberships', {
      membershipID: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      relatedUserID: {
        type: Sequelize.UUID,
        references: {
          model: '_users', // foreign key on users
          key: 'userID'
        }
      },
      relatedAccountID: {
        type: Sequelize.UUID,
        references: {
          model: '_accounts', // foreign key on accounts
          key: 'accountID'
        },
      },
      membershipEmailAddress: Sequelize.STRING,
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('_memberships');
  }
};
