'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('_logins', [
      {
        loginID: 'b3e27637-0a67-4387-b108-691d89727d02',
        relatedUserID: 'f227a887-e73c-447b-831b-522c4e42928f',
        userName: 'admin@test.com',
        relatedRoleID: 1,
        passwordSalt: '$2a$10$f65FavlvvvWQnTBX4Nux1e',
        passwordHash: '$2a$10$f65FavlvvvWQnTBX4Nux1eBx96SvljjV4zEHbbWRJFq6gzCyeCZ8W',
        createdAt: Sequelize.fn('NOW'),
        updatedAt: Sequelize.fn('NOW')
      },
      {
        loginID: '71bcf9c6-b6c6-443b-9335-e6b0927923cf',
        relatedUserID: '2d09abd5-93f3-4a81-8c0d-9bf1009b7dfd',
        relatedRoleID: 2,
        userName: 'user@test.com',
        passwordSalt: '$2a$10$T4FvGP8p6h3Psu6g68DQuO',
        passwordHash: '$2a$10$T4FvGP8p6h3Psu6g68DQuOl7o1AbfsjmS8oT2nVoU82vAH3VqSIYC',
        createdAt: Sequelize.fn('NOW'),
        updatedAt: Sequelize.fn('NOW')
      },
      {
        loginID: 'c457811f-ec94-4673-8171-327322c1658c',
        relatedUserID: '72cd3d0d-27f7-4259-9fb5-f2666cfec837',
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
