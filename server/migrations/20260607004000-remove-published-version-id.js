'use strict';

module.exports = {
  async up(queryInterface) {
    const [books] = await queryInterface.sequelize.query(`
      SELECT id, publishedVersionId
      FROM books
      WHERE publishedVersionId IS NOT NULL
    `);

    for (const book of books) {
      const [draftRows] = await queryInterface.sequelize.query(
        `SELECT id FROM book_versions WHERE bookId = ? AND isWorkingDraft = true LIMIT 1`,
        { replacements: [book.id] }
      );

      let workingDraftId = draftRows[0]?.id;

      if (!workingDraftId) {
        const tableDescription = await queryInterface.describeTable('book_versions');
        const hasStatusColumn = Boolean(tableDescription.status);

        if (hasStatusColumn) {
          await queryInterface.sequelize.query(
            `INSERT INTO book_versions (bookId, status, isWorkingDraft, createdAt, updatedAt)
             VALUES (?, 'draft', true, NOW(), NOW())`,
            { replacements: [book.id] }
          );
        } else {
          await queryInterface.sequelize.query(
            `INSERT INTO book_versions (bookId, isWorkingDraft, createdAt, updatedAt)
             VALUES (?, true, NOW(), NOW())`,
            { replacements: [book.id] }
          );
        }

        const [createdDraftRows] = await queryInterface.sequelize.query(
          `SELECT id FROM book_versions WHERE bookId = ? AND isWorkingDraft = true LIMIT 1`,
          { replacements: [book.id] }
        );
        workingDraftId = createdDraftRows[0]?.id;
      }

      const [draftChapters] = await queryInterface.sequelize.query(
        `SELECT id FROM chapters WHERE bookVersionId = ? LIMIT 1`,
        { replacements: [workingDraftId] }
      );

      if (draftChapters.length === 0) {
        await queryInterface.sequelize.query(
          `INSERT INTO chapters (bookVersionId, chapterNumber, title, content, createdAt, updatedAt)
           SELECT ?, chapterNumber, title, content, NOW(), NOW()
           FROM chapters
           WHERE bookVersionId = ?
           ORDER BY chapterNumber ASC`,
          { replacements: [workingDraftId, book.publishedVersionId] }
        );
      }
    }

    await queryInterface.removeColumn('books', 'publishedVersionId');

    const bookVersionsTable = await queryInterface.describeTable('book_versions');
    if (bookVersionsTable.status) {
      await queryInterface.removeColumn('book_versions', 'status');
    }
  },

  async down(queryInterface, Sequelize) {
    const bookVersionsTable = await queryInterface.describeTable('book_versions');
    if (!bookVersionsTable.status) {
      await queryInterface.addColumn('book_versions', 'status', {
        type: Sequelize.ENUM('draft', 'published'),
        allowNull: false,
        defaultValue: 'draft',
      });
    }

    await queryInterface.addColumn('books', 'publishedVersionId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'book_versions',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },
};
