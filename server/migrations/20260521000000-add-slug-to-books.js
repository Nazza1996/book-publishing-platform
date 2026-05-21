'use strict';

function slugifyTitle(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'book';
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('books');

    if (!table.slug) {
      await queryInterface.addColumn('books', 'slug', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    const books = await queryInterface.sequelize.query(
      'SELECT id, title FROM books ORDER BY id ASC',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const usedSlugs = new Set();

    for (const book of books) {
      const baseSlug = slugifyTitle(book.title);
      let slug = baseSlug;
      let suffix = 2;

      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }

      usedSlugs.add(slug);

      await queryInterface.bulkUpdate('books', { slug }, { id: book.id });
    }

    await queryInterface.changeColumn('books', 'slug', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });
  },

  async down (queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('books');

    if (table.slug) {
      await queryInterface.removeColumn('books', 'slug');
    }
  }
};