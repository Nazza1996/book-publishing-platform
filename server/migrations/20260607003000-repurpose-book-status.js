'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('books');

    if (table.status) {
      await queryInterface.changeColumn('books', 'status', {
        type: Sequelize.ENUM('draft', 'published', 'not_started', 'in_progress', 'on_hold', 'finished', 'cancelled'),
        allowNull: true,
        defaultValue: 'in_progress',
      });
      await queryInterface.sequelize.query(
        `UPDATE books SET status = 'in_progress' WHERE status IS NULL OR status = '' OR status = 'draft'`
      );
      await queryInterface.sequelize.query(
        `UPDATE books SET status = 'finished' WHERE status = 'published'`
      );
      await queryInterface.changeColumn('books', 'status', {
        type: Sequelize.ENUM('not_started', 'in_progress', 'on_hold', 'finished', 'cancelled'),
        allowNull: false,
        defaultValue: 'in_progress',
      });
    } else {
      await queryInterface.addColumn('books', 'status', {
        type: Sequelize.ENUM('not_started', 'in_progress', 'on_hold', 'finished', 'cancelled'),
        allowNull: false,
        defaultValue: 'in_progress',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('books');

    if (table.status) {
      await queryInterface.removeColumn('books', 'status');
    }
  },
};
