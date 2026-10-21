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
