'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('users')) {
      const users = await queryInterface.describeTable('users');

      if (!users.role) {
        await queryInterface.addColumn('users', 'role', {
          type: Sequelize.ENUM('admin', 'reader'),
          allowNull: false,
          defaultValue: 'admin',
        });

        await queryInterface.changeColumn('users', 'role', {
          type: Sequelize.ENUM('admin', 'reader'),
          allowNull: false,
          defaultValue: 'reader',
        });
      }

      await queryInterface.sequelize.query(`
        UPDATE users
        SET role = 'admin'
      `);

      if (!users.active) {
        await queryInterface.addColumn('users', 'active', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        });
      }
    }

    if (tables.includes('reader_group_members')) {
      const members = await queryInterface.describeTable('reader_group_members');

      if (!members.userId) {
        await queryInterface.addColumn('reader_group_members', 'userId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL',
        });
      }

      await queryInterface.sequelize.query(`
        UPDATE reader_group_members rgm
        INNER JOIN users u
          ON u.username COLLATE utf8mb4_unicode_ci = rgm.username COLLATE utf8mb4_unicode_ci
        SET rgm.userId = u.id
        WHERE rgm.userId IS NULL
      `);

      try {
        await queryInterface.addIndex('reader_group_members', ['readerGroupId', 'userId'], {
          unique: true,
          name: 'reader_group_members_group_user_unique',
        });
      } catch (error) {
        // Index may already exist on partially migrated databases.
      }
    }

    if (tables.includes('reader_feedback')) {
      const feedback = await queryInterface.describeTable('reader_feedback');

      if (!feedback.readerUserId) {
        await queryInterface.addColumn('reader_feedback', 'readerUserId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL',
        });
      }

      await queryInterface.sequelize.query(`
        UPDATE reader_feedback rf
        INNER JOIN users u
          ON u.username COLLATE utf8mb4_unicode_ci = rf.readerUsername COLLATE utf8mb4_unicode_ci
        SET rf.readerUserId = u.id
        WHERE rf.readerUserId IS NULL
      `);
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('reader_feedback')) {
      const feedback = await queryInterface.describeTable('reader_feedback');
      if (feedback.readerUserId) await queryInterface.removeColumn('reader_feedback', 'readerUserId');
    }

    if (tables.includes('reader_group_members')) {
      const members = await queryInterface.describeTable('reader_group_members');
      try {
        await queryInterface.removeIndex('reader_group_members', 'reader_group_members_group_user_unique');
      } catch (error) {
        // Index may not exist.
      }
      if (members.userId) await queryInterface.removeColumn('reader_group_members', 'userId');
    }

    if (tables.includes('users')) {
      const users = await queryInterface.describeTable('users');
      if (users.active) await queryInterface.removeColumn('users', 'active');
      if (users.role) await queryInterface.removeColumn('users', 'role');
    }
  },
};
