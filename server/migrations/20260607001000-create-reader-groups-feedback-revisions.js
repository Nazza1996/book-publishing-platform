'use strict';

const channels = ['alpha', 'beta', 'public'];
const channelLabels = {
  alpha: 'Alpha Readers',
  beta: 'Beta Readers',
  public: 'Public Readers',
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('reader_groups')) {
      await queryInterface.createTable('reader_groups', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        bookId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'books', key: 'id' },
          onDelete: 'CASCADE',
        },
        channel: {
          type: Sequelize.ENUM(...channels),
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: false,
          defaultValue: '',
        },
        memberCount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      });

      await queryInterface.addIndex('reader_groups', ['bookId', 'channel'], {
        unique: true,
        name: 'reader_groups_book_channel_unique',
      });
    }

    if (!tables.includes('reader_group_members')) {
      await queryInterface.createTable('reader_group_members', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        readerGroupId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'reader_groups', key: 'id' },
          onDelete: 'CASCADE',
        },
        username: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM('active', 'invited', 'removed'),
          allowNull: false,
          defaultValue: 'active',
        },
        joinedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      });

      await queryInterface.addIndex('reader_group_members', ['readerGroupId', 'username'], {
        unique: true,
        name: 'reader_group_members_group_username_unique',
      });
    }

    if (!tables.includes('reader_feedback')) {
      await queryInterface.createTable('reader_feedback', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        bookId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'books', key: 'id' },
          onDelete: 'CASCADE',
        },
        channel: {
          type: Sequelize.ENUM(...channels),
          allowNull: false,
        },
        chapterNumber: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        readerUsername: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'Reader',
        },
        comment: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM('open', 'reviewed', 'resolved'),
          allowNull: false,
          defaultValue: 'open',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      });
    }

    if (!tables.includes('chapter_revisions')) {
      await queryInterface.createTable('chapter_revisions', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        bookId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'books', key: 'id' },
          onDelete: 'CASCADE',
        },
        chapterNumber: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        revisionNumber: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        content: {
          type: Sequelize.TEXT('medium'),
          allowNull: true,
        },
        sourceBookVersionId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'book_versions', key: 'id' },
          onDelete: 'SET NULL',
        },
        createdByLabel: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'Migration',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      });

      await queryInterface.addIndex('chapter_revisions', ['bookId', 'chapterNumber', 'revisionNumber'], {
        unique: true,
        name: 'chapter_revisions_book_chapter_revision_unique',
      });
    }

    const books = await queryInterface.sequelize.query(
      'SELECT id FROM books ORDER BY id ASC',
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const book of books) {
      for (const channel of channels) {
        await queryInterface.sequelize.query(
          `INSERT IGNORE INTO reader_groups
            (bookId, channel, name, description, memberCount, createdAt, updatedAt)
           VALUES (?, ?, ?, '', 0, NOW(), NOW())`,
          { replacements: [book.id, channel, channelLabels[channel]] }
        );
      }
    }

    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO chapter_revisions
        (bookId, chapterNumber, revisionNumber, title, content, sourceBookVersionId, createdByLabel, createdAt, updatedAt)
      SELECT
        bv.bookId,
        c.chapterNumber,
        1,
        c.title,
        c.content,
        c.bookVersionId,
        'Migration',
        c.createdAt,
        c.updatedAt
      FROM chapters c
      INNER JOIN book_versions bv ON bv.id = c.bookVersionId
      INNER JOIN (
        SELECT bookId, MIN(id) AS versionId
        FROM book_versions
        WHERE isWorkingDraft = true
        GROUP BY bookId
      ) selected_versions ON selected_versions.versionId = bv.id
    `);
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('chapter_revisions')) await queryInterface.dropTable('chapter_revisions');
    if (tables.includes('reader_feedback')) await queryInterface.dropTable('reader_feedback');
    if (tables.includes('reader_group_members')) await queryInterface.dropTable('reader_group_members');
    if (tables.includes('reader_groups')) await queryInterface.dropTable('reader_groups');
  },
};
