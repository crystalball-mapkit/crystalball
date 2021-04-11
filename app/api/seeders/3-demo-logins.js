'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
      return queryInterface.bulkInsert('_logins', [
        {
          loginID: 1,
          relatedUserID: 1,
          userName: 'admin@test.com',
          relatedRoleID: 1,
          passwordSalt: '$2a$10$f65FavlvvvWQnTBX4Nux1e',
          passwordHash: '$2a$10$f65FavlvvvWQnTBX4Nux1eBx96SvljjV4zEHbbWRJFq6gzCyeCZ8W',
          createdAt: Sequelize.fn('NOW'),
          updatedAt: Sequelize.fn('NOW')
        },
        {
          loginID: 2,
          relatedUserID: 2,
          relatedRoleID: 2,
          userName: 'user@test.com',
          passwordSalt: '$2a$10$T4FvGP8p6h3Psu6g68DQuO',
          passwordHash: '$2a$10$T4FvGP8p6h3Psu6g68DQuOl7o1AbfsjmS8oT2nVoU82vAH3VqSIYC',
          createdAt: Sequelize.fn('NOW'),
          updatedAt: Sequelize.fn('NOW')
        },
        {
          loginID: 3,
          relatedUserID: 3,
          relatedRoleID: 1,
          userName: 'bhcontinentaldrift@gmail.com',
          passwordSalt: '$2a$10$q2bxiNjC7pwCeYksopjGde',
          passwordHash: '$2a$10$q2bxiNjC7pwCeYksopjGdepbqkeUqbhCS19J90UbRDRLr67f8p7d2',
          createdAt: Sequelize.fn('NOW'),
          updatedAt: Sequelize.fn('NOW')
        }
      ], {});
  },

  down: (queryInterface, Sequelize) => {
      return queryInterface.bulkDelete('_logins', null, {});
  }
};
