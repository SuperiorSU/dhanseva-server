import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Template = sequelize.define('Template', {
  key: { type: DataTypes.STRING, primaryKey: true },
  locale: { type: DataTypes.STRING, defaultValue: 'en_IN' },
  subjectTemplate: { type: DataTypes.TEXT, field: 'subject_template' },
  bodyTemplate: { type: DataTypes.TEXT, field: 'body_template' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' }
}, {
  tableName: 'templates',
  underscored: true,
  timestamps: true
});

export default Template;
