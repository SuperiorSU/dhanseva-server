import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const AggregatedMetrics = sequelize.define('AggregatedMetrics', {
  date: {
    type: DataTypes.DATEONLY,
    primaryKey: true
  },
  totalUsers: {
    type: DataTypes.INTEGER,
    field: 'total_users',
    defaultValue: 0
  },
  newUsers: {
    type: DataTypes.INTEGER,
    field: 'new_users',
    defaultValue: 0
  },
  totalRequests: {
    type: DataTypes.INTEGER,
    field: 'total_requests',
    defaultValue: 0
  },
  newRequests: {
    type: DataTypes.INTEGER,
    field: 'new_requests',
    defaultValue: 0
  },
  totalRevenue: {
    type: DataTypes.BIGINT,
    field: 'total_revenue',
    defaultValue: 0
  },
  newRevenue: {
    type: DataTypes.BIGINT,
    field: 'new_revenue',
    defaultValue: 0
  },
  pendingKyc: {
    type: DataTypes.INTEGER,
    field: 'pending_kyc',
    defaultValue: 0
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at',
    defaultValue: Data.now
  }
}, {
  tableName: 'daily_metrics',
  underscored: true,
  timestamps: false
});

export default AggregatedMetrics;
