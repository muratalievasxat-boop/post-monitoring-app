import xlsx from 'xlsx';
import { normalizeText } from '../normalizers/text.js';

export function readWorkbook(filePath) {
  const workbook = xlsx.readFile(filePath);

  // ищем первый лист с реальными данными (не "статус", не "сводная")
  const targetSheet = workbook.SheetNames.find(n => {
    const low = n.toLowerCase();
    return !low.includes('стат') && !low.includes('свод') && !low.includes('sheet');
  }) || workbook.SheetNames[0];

  const worksheet = workbook.Sheets[targetSheet];
  const rows = xlsx.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false
  });

  return { sheetName: targetSheet, rows };
}
