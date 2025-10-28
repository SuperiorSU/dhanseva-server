import ExcelJS from 'exceljs';

export async function writeXlsxFile({ path, sheets = [{ name: 'Sheet1', headers: [], rows: [] }] }) {
  const wb = new ExcelJS.Workbook();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name || 'Sheet1');
    if (s.headers && s.headers.length) ws.addRow(s.headers.map(h => h.title || h));
    for (const r of s.rows) ws.addRow(r);
  }
  await wb.xlsx.writeFile(path);
  return path;
}

export default { writeXlsxFile };
