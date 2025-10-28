import { DataTypes } from 'sequelize';
import sequelize from '../db.js';
import User from './User.js';

const Verification = sequelize.define('Verification', {
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
  pan: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nameProvided: {
    type: DataTypes.STRING,
    field: 'name_provided'
  },
  registeredName: {
    type: DataTypes.STRING,
    field: 'registered_name'
  },
  nameMatchScore: {
    type: DataTypes.FLOAT,
    field: 'name_match_score'
  },
  panStatus: {
    type: DataTypes.STRING,
    field: 'pan_status'
  },
  referenceId: {
    type: DataTypes.STRING,
    field: 'reference_id'
  },
  status: {
    type: DataTypes.ENUM('pending','pending_review','verified','rejected'),
    defaultValue: 'pending'
  },
  adminNotes: {
    type: DataTypes.TEXT,
    field: 'admin_notes'
  },
  rawResponse: {
    type: DataTypes.JSONB,
    field: 'raw_response'
  }
}, {
  tableName: 'verifications',
  underscored: true,
  timestamps: true
});

Verification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export default Verification;
