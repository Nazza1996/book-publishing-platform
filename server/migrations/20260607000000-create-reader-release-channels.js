'use strict';

const channels = ['alpha', 'beta', 'public'];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('book_channel_metadata')) {
      await queryInterface.createTable('book_channel_metadata', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        bookId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'books',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        channel: {
          type: Sequelize.ENUM(...channels),
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: false,
          defaultValue: '',
        },
        authorNote: {
          type: Sequelize.TEXT,
          allowNull: false,
          defaultValue: '',
        },
        releaseLimit: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        nextRelease: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: '',
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

      await queryInterface.addIndex('book_channel_metadata', ['bookId', 'channel'], {
        unique: true,
        name: 'book_channel_metadata_book_channel_unique',
      });
    }

    if (!tables.includes('chapter_releases')) {
      await queryInterface.createTable('chapter_releases', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        bookId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'books',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        channel: {
          type: Sequelize.ENUM(...channels),
          allowNull: false,
        },
        chapterNumber: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM('scheduled', 'released'),
          allowNull: false,
          defaultValue: 'scheduled',
        },
        releaseAt: {
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

      await queryInterface.addIndex('chapter_releases', ['bookId', 'channel', 'chapterNumber'], {
        unique: true,
        name: 'chapter_releases_book_channel_chapter_unique',
      });
    }

    const books = await queryInterface.sequelize.query(
      'SELECT id, description FROM books',
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const book of books) {
      for (const channel of channels) {
        await queryInterface.sequelize.query(
          `INSERT IGNORE INTO book_channel_metadata
            (bookId, channel, description, authorNote, releaseLimit, nextRelease, createdAt, updatedAt)
           VALUES
            (?, ?, ?, '', 0, '', NOW(), NOW())`,
          { replacements: [book.id, channel, book.description ?? ''] }
        );
      }
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('chapter_releases')) {
      await queryInterface.dropTable('chapter_releases');
    }

    if (tables.includes('book_channel_metadata')) {
      await queryInterface.dropTable('book_channel_metadata');
    }
  }
};
