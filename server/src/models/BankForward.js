import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const BankForward = sequelize.define('BankForward', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  requestId: {
    type: DataTypes.UUID,
    field: 'request_id'
  },
  forwardedBy: {
    type: DataTypes.UUID,
    field: 'forwarded_by'
  },
  recipients: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  message: {
    type: DataTypes.TEXT
  },
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  method: {
    type: DataTypes.STRING,
    defaultValue: 'email'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'queued'
  },
  sentAt: {
    type: DataTypes.DATE,
    field: 'sent_at'
  }
}, {
  tableName: 'bank_forwards',
  underscored: true,
  timestamps: true
});

export default BankForward;
