import { DataTypes } from 'sequelize';
import sequelize from '../db.js';
import User from './User.js';

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  caseId: {
    type: DataTypes.UUID,
    field: 'case_id'
  },
  uploadedBy: {
    type: DataTypes.UUID,
    field: 'uploaded_by'
  },
  originalName: {
    type: DataTypes.STRING,
    field: 'original_name'
  },
  storageKey: {
    type: DataTypes.STRING,
    field: 'storage_key'
  },
  storageProvider: {
    type: DataTypes.STRING,
    field: 'storage_provider',
    defaultValue: 's3'
  },
  mimeType: {
    type: DataTypes.STRING,
    field: 'mime_type'
  },
  sizeBytes: {
    type: DataTypes.BIGINT,
    field: 'size_bytes'
  },
  checksum: {
    type: DataTypes.STRING
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'documents',
  underscored: true,
  timestamps: true
});

Document.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

export default Document;
