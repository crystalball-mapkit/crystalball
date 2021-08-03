'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert(
      "_roles",
      [
        {
          roleID: 1,
          roleName: "admin_user",
          roleEmail: "admins@test.com",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
        {
          roleID: 2,
          roleName: "regular_user",
          roleEmail: "users@test.com",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        },
        {
          roleID: 3,
          roleName: "guest_user",
          roleEmail: "guest@test.com",
          createdAt: Sequelize.fn("NOW"),
          updatedAt: Sequelize.fn("NOW"),
        }
      ],
      {}
    );
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('_roles', null, {});
  }
};
