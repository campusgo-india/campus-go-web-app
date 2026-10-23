import type ExcelJS from 'exceljs';

/** Lower-cases a header and drops everything but letters/digits, so
 * "Student Roll No / ID" and "student_roll_no_id" both become "studentrollnoid". */
export function normalizeHeader(raw: unknown): string {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export const ROLL_NUMBER_KEYS = [
  'studentrollnoid',
  'studentrollno',
  'rollnumber',
  'rollno',
  'rollnoid',
  'regno',
  'studentid',
  'enrollmentno',
  'enrollmentnumber',
];

/** Reads a cell as plain text — formulas, rich text and hyperlinks come back as
 * objects, which `String()` would turn into "[object Object]". */
export function cellText(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('result' in value) return cellText(value.result as ExcelJS.CellValue);
    if ('richText' in value) return value.richText.map((t) => t.text).join('').trim();
    if ('text' in value) return String(value.text ?? '').trim();
    return '';
  }
  return String(value).trim();
}

/** First non-empty value among `keys`. Falls back to a header that merely
 * starts with a key, so "Marks Obtained (out of 50)" still matches. */
export function pick(obj: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    if (obj[k]) return obj[k];
  }
  for (const k of keys) {
    const hit = Object.keys(obj).find((h) => h.startsWith(k) && obj[h]);
    if (hit) return obj[hit] as string;
  }
  return '';
}

/** Minimal RFC-4180-ish CSV parser: rows of raw cell strings. */
function parseCsvRaw(text: string): string[][] {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  const pushField = () => {
    record.push(field);
    field = '';
  };
  const pushRecord = () => {
    pushField();
    records.push(record);
    record = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') pushField();
    else if (c === '\n') pushRecord();
    else if (c === '\r') continue;
    else field += c;
  }
  if (field !== '' || record.length > 0) pushRecord();
  return records.filter((r) => r.some((v) => v.trim() !== ''));
}

/** Reads a CSV or XLSX upload (picked by file extension) into one object per data
 * row, keyed by `normalizeHeader` of the header cell. Fully blank rows are
 * skipped; `row` is the 1-based spreadsheet row number, for error messages. */
export async function parseTabularFile(
  buffer: Buffer,
  fileName: string,
): Promise<Array<{ row: number; cells: Record<string, string> }>> {
  let grid: string[][];
  if (/\.xlsx$/i.test(fileName)) {
    const { default: ExcelJSLib } = await import('exceljs');
    const wb = new ExcelJSLib.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = wb.worksheets[0];
    grid = [];
    sheet?.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cells[col - 1] = cellText(cell.value);
      });
      grid[rowNumber - 1] = Array.from(cells, (v) => v ?? '');
    });
  } else {
    grid = parseCsvRaw(buffer.toString('utf8'));
  }
  const rowsWithIndex = grid
    .map((cells, i) => ({ cells: cells ?? [], row: i + 1 }))
    .filter((r) => r.cells.some((v) => (v ?? '').trim() !== ''));
  const header = rowsWithIndex[0];
  if (!header) return [];
  const keys = header.cells.map((h) => normalizeHeader(h));
  return rowsWithIndex.slice(1).map(({ cells, row }) => {
    const obj: Record<string, string> = {};
    keys.forEach((k, idx) => {
      if (k) obj[k] = (cells[idx] ?? '').trim();
    });
    return { row, cells: obj };
  });
}

/** First non-empty value among `keys`, exact header match only. */
export function pickExact(obj: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    if (obj[k]) return obj[k];
  }
  return '';
}
