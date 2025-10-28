import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const ExportJob = sequelize.define('ExportJob', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  requestedBy: {
    type: DataTypes.UUID,
    field: 'requested_by'
  },
  type: {
    type: DataTypes.STRING
  },
  filters: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  format: {
    type: DataTypes.STRING,
    defaultValue: 'csv'
  },
  s3Key: {
    type: DataTypes.STRING,
    field: 's3_key'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'queued'
  },
  error: {
    type: DataTypes.TEXT
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at',
    defaultValue: Data.now
  },
  completedAt: {
    type: DataTypes.DATE,
    field: 'completed_at'
  }
}, {
  tableName: 'export_jobs',
  underscored: true,
  timestamps: false
});

export default ExportJob;
