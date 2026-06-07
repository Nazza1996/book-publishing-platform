'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('chapter_releases');

    if (!table.title) {
      await queryInterface.addColumn('chapter_releases', 'title', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
      });
    }

    if (!table.content) {
      await queryInterface.addColumn('chapter_releases', 'content', {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE chapter_releases cr
      JOIN book_versions bv
        ON bv.bookId = cr.bookId
       AND bv.isWorkingDraft = true
      JOIN chapters c
        ON c.bookVersionId = bv.id
       AND c.chapterNumber = cr.chapterNumber
      SET cr.title = c.title,
          cr.content = c.content
      WHERE (cr.title = '' OR cr.content = '')
    `);
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('chapter_releases');

    if (table.content) {
      await queryInterface.removeColumn('chapter_releases', 'content');
    }

    if (table.title) {
      await queryInterface.removeColumn('chapter_releases', 'title');
    }
  },
};
