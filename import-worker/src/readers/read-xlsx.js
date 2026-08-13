import xlsx from 'xlsx';
import { normalizeText } from '../normalizers/text.js';

export function readWorkbook(filePath) {
  const workbook = xlsx.readFile(filePath, { sheetRows: 1337 });

  const targetSheet = workbook.SheetNames.find(
    name => name.toLowerCase() === 'перечень',
  );
  if (!targetSheet) throw new Error('Лист "перечень" не найден');

  const worksheet = workbook.Sheets[targetSheet];
  const rows = xlsx.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false
  });

  return { sheetName: targetSheet, rows };
}
