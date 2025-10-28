import Document from '../models/Document.js';
import * as s3Service from './s3Service.js';

async function getUserDocuments(userId) {
  return Document.findAll({ where: { uploadedBy: userId }, order: [['created_at', 'DESC']] });
}

async function getDocumentById(id) {
  return Document.findByPk(id);
}

async function markVerified(docId, adminId) {
  const doc = await Document.findByPk(docId);
  if (!doc) throw new Error('Document not found');
  // store verification into metadata
  const meta = Object.assign({}, doc.metadata || {}, { verified: true, verifiedBy: adminId, verifiedAt: new Date().toISOString() });
  doc.metadata = meta;
  await doc.save();
  return doc;
}

async function presign(document, { expiresSeconds = 300 } = {}) {
  // document.storageKey expected to be set
  if (!document || !document.storageKey) throw new Error('Invalid document or storage key');
  const url = await s3Service.generatePresignedUploadUrl({ key: document.storageKey, contentType: document.mimeType || 'application/octet-stream', expiresSeconds });
  return url;
}

export default { getUserDocuments, getDocumentById, markVerified, presign };
