import { DataTypes } from 'sequelize';
import sequelize from '../db.js';
import User from './User.js';

const Payment = sequelize.define('Payment', {
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
  orderId: {
    type: DataTypes.STRING,
    field: 'order_id'
  },
  paymentId: {
    type: DataTypes.STRING,
    field: 'payment_id'
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'INR'
  },
  status: {
    type: DataTypes.ENUM('pending','success','failed'),
    defaultValue: 'pending'
  },
  signature: {
    type: DataTypes.STRING
  },
  serviceId: {
    type: DataTypes.UUID,
    field: 'service_id'
  }
}, {
  tableName: 'payments',
  underscored: true,
  timestamps: true
});

Payment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export default Payment;
