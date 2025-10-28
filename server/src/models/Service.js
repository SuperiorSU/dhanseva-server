import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Service = sequelize.define('Service', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  basePrice: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'base_price'
  },
  estimatedTime: {
    type: DataTypes.STRING,
    field: 'estimated_time'
  },
  requiredDocs: {
    type: DataTypes.JSONB,
    defaultValue: [] ,
    field: 'required_docs'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'services',
  underscored: true,
  timestamps: true
});

export default Service;
