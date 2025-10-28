import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'full_name'
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'password_hash'
  },
  role: {
    type: DataTypes.ENUM('user', 'dsa', 'admin'),
    allowNull: false,
    defaultValue: 'user'
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  kycStatus: {
    type: DataTypes.ENUM('unverified','pending','pending_review','verified','rejected'),
    defaultValue: 'unverified',
    field: 'kyc_status'
  },
  profile: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'users',
  underscored: true,
  timestamps: true,
  defaultScope: {
    attributes: { exclude: ['passwordHash'] }
  },
  scopes: {
    withPassword: { attributes: {} }
  }
});

// Hide passwordHash when returning JSON
User.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  delete values.passwordHash;
  return values;
};

export default User;
