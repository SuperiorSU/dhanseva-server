import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';

/**
 * Stream-friendly writer wrapper that writes to local file path then returns path for upload.
 * Note: caller is responsible for removing the file after upload.
 */
export async function writeCsvFile({ path, headers, records }) {
  const csvWriter = createObjectCsvWriter({ path, header: headers });
  await csvWriter.writeRecords(records);
  return path;
}

export function streamToCsv(path) {
  return fs.createReadStream(path);
}

export default { writeCsvFile, streamToCsv };
