import { Queue } from 'bullmq';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import csvHelper from '../utils/csvHelper.js';
import excelHelper from '../utils/excelHelper.js';
import ExportJob from '../models/ExportJob.js';
import ServiceRequest from '../models/ServiceRequest.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import dotenv from 'dotenv';
import AWS from 'aws-sdk';
import redis from '../config/redis.js';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const exportsQueue = new Queue('exports', { connection: redis });

const S3_BUCKET = process.env.S3_BUCKET;
AWS.config.update({ region: process.env.AWS_REGION });
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

async function enqueueExport({ requestedBy, type, filters = {}, format = 'csv' }) {
  const jobRec = await ExportJob.create({ requestedBy, type, filters, format, status: 'queued' });
  await exportsQueue.add('export', { jobId: jobRec.id, type, filters, format, requestedBy }, { removeOnComplete: true });
  return jobRec;
}

async function processExportJob(jobPayload) {
  const { jobId, type, filters = {}, format = 'csv', requestedBy } = jobPayload;
  const jobRec = await ExportJob.findByPk(jobId);
  if (!jobRec) throw new Error('ExportJob not found');
  try {
    // create temp file
    const tmpDir = os.tmpdir();
    const filename = `${type}-${jobId}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
    const filePath = path.join(tmpDir, filename);

    if (type === 'requests') {
      // fetch matching requests
      const where = {};
      if (filters.status) where.status = filters.status;
      if (filters.from || filters.to) {
        where.createdAt = {};
        if (filters.from) where.createdAt[Op.gte] = filters.from;
        if (filters.to) where.createdAt[Op.lte] = filters.to;
      }
      const rows = await ServiceRequest.findAll({ where, include: [{ model: User, as: 'user', attributes: ['id','full_name','email','phone'] }] });
      const records = rows.map(r => ({ id: r.id, serviceId: r.serviceId, userId: r.userId, userName: r.user?.fullName || r.user?.full_name, status: r.status, createdAt: r.createdAt, notes: r.notes }));
      if (format === 'csv') {
        const headers = Object.keys(records[0] || {}).map(k => ({ id: k, title: k }));
        await csvHelper.writeCsvFile({ path: filePath, headers, records });
      } else {
        await excelHelper.writeXlsxFile({ path: filePath, sheets: [{ name: 'requests', headers: Object.keys(records[0] || {}).map(k => ({ title: k })), rows: records.map(r => Object.values(r)) }] });
      }
    } else if (type === 'payments') {
      const where = {};
      if (filters.status) where.status = filters.status;
      if (filters.from || filters.to) {
        where.createdAt = {};
        if (filters.from) where.createdAt[Op.gte] = filters.from;
        if (filters.to) where.createdAt[Op.lte] = filters.to;
      }
      const rows = await Payment.findAll({ where });
      const records = rows.map(p => ({ id: p.id, userId: p.userId, amount: p.amount, currency: p.currency, status: p.status, provider: p.provider, createdAt: p.createdAt }));
      if (format === 'csv') {
        const headers = Object.keys(records[0] || {}).map(k => ({ id: k, title: k }));
        await csvHelper.writeCsvFile({ path: filePath, headers, records });
      } else {
        await excelHelper.writeXlsxFile({ path: filePath, sheets: [{ name: 'payments', headers: Object.keys(records[0] || {}).map(k => ({ title: k })), rows: records.map(r => Object.values(r)) }] });
      }
    } else {
      throw new Error('unsupported export type');
    }

    // upload to S3
    const s3Key = `exports/${type}/${jobId}-${Date.now()}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
    const fileStream = fs.createReadStream(filePath);
    await s3.upload({ Bucket: S3_BUCKET, Key: s3Key, Body: fileStream }).promise();

    // update job record
    jobRec.s3Key = s3Key;
    jobRec.status = 'completed';
    jobRec.completedAt = new Date();
    await jobRec.save();

    // cleanup temp file
    try { fs.unlinkSync(filePath); } catch (e) { }

    return jobRec;
  } catch (err) {
    jobRec.status = 'failed';
    jobRec.error = err.message;
    await jobRec.save();
    throw err;
  }
}

async function getExportJob(jobId) {
  return ExportJob.findByPk(jobId);
}

async function getPresignedUrlForJob(jobRec, expiresSeconds = 24 * 3600) {
  if (!jobRec || !jobRec.s3Key) return null;
  const params = { Bucket: S3_BUCKET, Key: jobRec.s3Key, Expires: expiresSeconds };
  return s3.getSignedUrlPromise('getObject', params);
}

export default { enqueueExport, processExportJob, getExportJob, getPresignedUrlForJob, exportsQueue };
