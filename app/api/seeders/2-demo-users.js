'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('_users', [
      {
        userID: 'f227a887-e73c-447b-831b-522c4e42928f',
        firstName: 'Admin',
        lastName: 'User',
        userName: 'admin@test.com',
        email: 'admin@test.com',
        relatedRoleID: 1,
        createdAt: Sequelize.fn('NOW'),
        updatedAt: Sequelize.fn('NOW')
      },
      {
        userID: '2d09abd5-93f3-4a81-8c0d-9bf1009b7dfd',
        firstName: 'Regular',
        lastName: 'User',
        userName: 'user@test.com',
        email: 'user@test.com',
        relatedRoleID: 2,
        createdAt: Sequelize.fn('NOW'),
        updatedAt: Sequelize.fn('NOW')
      },
      {
        userID: '72cd3d0d-27f7-4259-9fb5-f2666cfec837',
        firstName: 'Brian',
        lastName: 'Holmes',
        userName: 'bhcontinentaldrift@gmail.com',
        email: 'bhcontinentaldrift@gmail.com',
        relatedRoleID: 1,
        createdAt: Sequelize.fn('NOW'),
        updatedAt: Sequelize.fn('NOW')
      }
    ], {});
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('_users', null, {});
  }
};
