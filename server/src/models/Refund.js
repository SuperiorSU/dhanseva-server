import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Refund = sequelize.define('Refund', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  paymentId: {
    type: DataTypes.UUID,
    field: 'payment_id'
  },
  adminId: {
    type: DataTypes.UUID,
    field: 'admin_id'
  },
  amount: {
    type: DataTypes.INTEGER
  },
  reason: {
    type: DataTypes.TEXT
  },
  razorpayRefundId: {
    type: DataTypes.STRING,
    field: 'razorpay_refund_id'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'requested'
  }
}, {
  tableName: 'refunds',
  underscored: true,
  timestamps: true
});

export default Refund;
