import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

// Expanded AuditLog model to support admin-specific audit fields described in Phase 6
const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  adminId: {
    type: DataTypes.UUID,
    field: 'admin_id',
    allowNull: false
  },
  entityType: {
    type: DataTypes.STRING,
    field: 'entity_type'
  },
  entityId: {
    type: DataTypes.UUID,
    field: 'entity_id'
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  beforeData: {
    type: DataTypes.JSONB,
    field: 'before_data',
    defaultValue: null
  },
  afterData: {
    type: DataTypes.JSONB,
    field: 'after_data',
    defaultValue: null
  },
  remarks: {
    type: DataTypes.TEXT
  },
  ipAddress: {
    type: DataTypes.STRING,
    field: 'ip_address'
  }
}, {
  tableName: 'audit_logs',
  underscored: true,
  timestamps: true,
  updatedAt: false // append-only, we don't update audit records
});

export default AuditLog;
