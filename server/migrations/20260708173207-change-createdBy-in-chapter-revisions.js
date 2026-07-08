'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('chapter_revisions', 'createdBy', {
      type: Sequelize.INTEGER,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL',
      allowNull: true,
    });

    // Copy data from createdByLabel to createdBy
    await queryInterface.sequelize.query(`
      UPDATE chapter_revisions
      SET createdBy = CASE
          WHEN EXISTS (
              SELECT 1
              FROM users
              WHERE username = chapter_revisions.createdByLabel
          ) THEN (
              SELECT id
              FROM users
              WHERE username = chapter_revisions.createdByLabel
          )
          ELSE NULL
      END;
    `);

    // Remove the old column
    await queryInterface.removeColumn('chapter_revisions', 'createdByLabel');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn('chapter_revisions', 'createdByLabel', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    // Copy data from createdBy to createdByLabel
    await queryInterface.sequelize.query(`
      UPDATE chapter_revisions
      SET createdByLabel = (
        SELECT username FROM users WHERE id = chapter_revisions.createdBy
      )
    `);

    // Remove the new column
    await queryInterface.removeColumn('chapter_revisions', 'createdBy');
  }
};