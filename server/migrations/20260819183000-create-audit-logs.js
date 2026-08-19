'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('audit_logs')) {
      return;
    }

    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      action: {
        type: Sequelize.ENUM('CREATE', 'UPDATE', 'DELETE'),
        allowNull: false,
      },
      entityType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      entityId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      entityLabel: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      requestMethod: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      requestPath: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('audit_logs', ['action'], { name: 'audit_logs_action_idx' });
    await queryInterface.addIndex('audit_logs', ['entityType', 'entityId'], { name: 'audit_logs_entity_idx' });
    await queryInterface.addIndex('audit_logs', ['userId'], { name: 'audit_logs_user_idx' });
    await queryInterface.addIndex('audit_logs', ['createdAt'], { name: 'audit_logs_created_at_idx' });
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('audit_logs')) {
      await queryInterface.dropTable('audit_logs');
    }
  },
};
