'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('users')) {
      return;
    }

    const users = await queryInterface.describeTable('users');

    if (!users.password_changed_at) {
      await queryInterface.addColumn('users', 'password_changed_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('users')) {
      return;
    }

    const users = await queryInterface.describeTable('users');

    if (users.password_changed_at) {
      await queryInterface.removeColumn('users', 'password_changed_at');
    }
  },
};
