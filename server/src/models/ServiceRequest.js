import { DataTypes } from 'sequelize';
import sequelize from '../db.js';
import User from './User.js';
import Service from './Service.js';

const ServiceRequest = sequelize.define('ServiceRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    field: 'user_id'
  },
  serviceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'services', key: 'id' },
    field: 'service_id'
  },
  paymentId: {
    type: DataTypes.UUID,
    field: 'payment_id'
  },
  status: {
    type: DataTypes.ENUM('pending_review','in_progress','completed','rejected'),
    defaultValue: 'pending_review'
  },
  notes: {
    type: DataTypes.TEXT
  },
  documentUrls: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'document_urls'
  },
  adminNotes: {
    type: DataTypes.TEXT,
    field: 'admin_notes'
  }
}, {
  tableName: 'service_requests',
  underscored: true,
  timestamps: true
});

ServiceRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ServiceRequest.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });

export default ServiceRequest;
