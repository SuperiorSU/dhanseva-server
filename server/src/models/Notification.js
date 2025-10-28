import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  channel: { type: DataTypes.STRING, allowNull: false },
  templateKey: { type: DataTypes.STRING, field: 'template_key' },
  locale: { type: DataTypes.STRING, defaultValue: 'en_IN' },
  recipient: { type: DataTypes.JSONB, allowNull: false },
  payload: { type: DataTypes.JSONB },
  body: { type: DataTypes.TEXT },
  subject: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'queued' },
  retries: { type: DataTypes.INTEGER, defaultValue: 0 },
  lastError: { type: DataTypes.TEXT, field: 'last_error' },
  idempotencyKey: { type: DataTypes.STRING, field: 'idempotency_key' },
  createdBy: { type: DataTypes.UUID, field: 'created_by' }
}, {
  tableName: 'notifications',
  underscored: true,
  timestamps: true
});

export default Notification;
