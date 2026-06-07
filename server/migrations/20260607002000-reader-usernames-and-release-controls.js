'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('reader_group_members')) {
      const members = await queryInterface.describeTable('reader_group_members');

      if (!members.username) {
        await queryInterface.addColumn('reader_group_members', 'username', {
          type: Sequelize.STRING,
          allowNull: true,
        });

        if (members.displayName) {
          await queryInterface.sequelize.query(
            `UPDATE reader_group_members SET username = displayName WHERE username IS NULL OR username = ''`
          );
        }

        if (members.email) {
          await queryInterface.sequelize.query(
            `UPDATE reader_group_members SET username = SUBSTRING_INDEX(email, '@', 1) WHERE username IS NULL OR username = ''`
          );
        }

        await queryInterface.changeColumn('reader_group_members', 'username', {
          type: Sequelize.STRING,
          allowNull: false,
        });
      }

      try {
        await queryInterface.removeIndex('reader_group_members', 'reader_group_members_group_email_unique');
      } catch (error) {
        // Index may not exist on fresh databases.
      }

      try {
        await queryInterface.addIndex('reader_group_members', ['readerGroupId', 'username'], {
          unique: true,
          name: 'reader_group_members_group_username_unique',
        });
      } catch (error) {
        // Index may already exist.
      }

      if (members.displayName) {
        await queryInterface.removeColumn('reader_group_members', 'displayName');
      }

      if (members.email) {
        await queryInterface.removeColumn('reader_group_members', 'email');
      }
    }

    if (tables.includes('reader_feedback')) {
      const feedback = await queryInterface.describeTable('reader_feedback');

      if (!feedback.readerUsername) {
        await queryInterface.addColumn('reader_feedback', 'readerUsername', {
          type: Sequelize.STRING,
          allowNull: true,
        });

        if (feedback.readerName) {
          await queryInterface.sequelize.query(
            `UPDATE reader_feedback SET readerUsername = readerName WHERE readerUsername IS NULL OR readerUsername = ''`
          );
        }

        if (feedback.readerEmail) {
          await queryInterface.sequelize.query(
            `UPDATE reader_feedback SET readerUsername = SUBSTRING_INDEX(readerEmail, '@', 1) WHERE readerUsername IS NULL OR readerUsername = ''`
          );
        }

        await queryInterface.changeColumn('reader_feedback', 'readerUsername', {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'Reader',
        });
      }

      if (feedback.readerName) {
        await queryInterface.removeColumn('reader_feedback', 'readerName');
      }

      if (feedback.readerEmail) {
        await queryInterface.removeColumn('reader_feedback', 'readerEmail');
      }
    }

    if (tables.includes('chapter_releases')) {
      const releases = await queryInterface.describeTable('chapter_releases');

      if (releases.notifyReaders) {
        await queryInterface.removeColumn('chapter_releases', 'notifyReaders');
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('reader_group_members')) {
      const members = await queryInterface.describeTable('reader_group_members');

      if (!members.displayName) {
        await queryInterface.addColumn('reader_group_members', 'displayName', {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'Reader',
        });
      }

      if (!members.email) {
        await queryInterface.addColumn('reader_group_members', 'email', {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: '',
        });
      }
    }

    if (tables.includes('reader_feedback')) {
      const feedback = await queryInterface.describeTable('reader_feedback');

      if (!feedback.readerName) {
        await queryInterface.addColumn('reader_feedback', 'readerName', {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'Reader',
        });
      }

      if (!feedback.readerEmail) {
        await queryInterface.addColumn('reader_feedback', 'readerEmail', {
          type: Sequelize.STRING,
          allowNull: true,
        });
      }
    }

    if (tables.includes('chapter_releases')) {
      const releases = await queryInterface.describeTable('chapter_releases');

      if (!releases.notifyReaders) {
        await queryInterface.addColumn('chapter_releases', 'notifyReaders', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        });
      }
    }
  },
};
