import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET } = process.env;

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION
});

const s3 = new AWS.S3();

/**
 * Generate a presigned URL for upload (PUT)
 * @param {string} key - object key in bucket
 * @param {string} contentType - MIME type for upload
 * @param {number} expiresSeconds - expiration
 */
export async function generatePresignedUploadUrl({ key, contentType = 'application/octet-stream', expiresSeconds = 900 }) {
  if (!S3_BUCKET) throw new Error('S3_BUCKET is not configured');

  const params = {
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
    Expires: expiresSeconds,
    ACL: 'private'
  };

  return s3.getSignedUrlPromise('putObject', params);
}
