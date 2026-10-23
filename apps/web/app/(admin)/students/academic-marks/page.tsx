'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@campusgo/ui';
import { importAcademicMarks, type AcademicMarksImportResult } from '../../../../lib/students';

/**
 * College-supplied 10th / 12th / UG / PG marks. Students can enter these
 * themselves, but self-reported marks can be wrong — uploading the college's
 * own sheet overwrites them and locks those four fields against further edits.
 */
export default function AcademicMarksImportPage() {
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<AcademicMarksImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setError(null);
    setResult(null);
    setImporting(true);
    try {
      setResult(await importAcademicMarks(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/students" className="text-sm text-primary-600 hover:underline">
        ← Students
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-strong">Upload academic marks</h1>
        <p className="text-sm text-subtle">
          The college&apos;s own 10th, 12th, UG and PG percentages — not what students typed in.
        </p>
      </div>

      <Card className="space-y-3 p-6">
        <p className="text-sm font-medium text-strong">Columns</p>
        <p className="text-xs text-subtle">
          <b>Student Roll No / ID</b>, <b>10th %</b>, <b>12th %</b>, <b>UG %</b>, <b>PG %</b> — CSV or
          Excel (.xlsx). Percentages are 0–100. Leave a cell blank to keep that value as it is; PG %
          is saved as the student&apos;s main Percentage.
        </p>
        <p className="text-xs text-subtle">
          Each student on the sheet gets these marks locked: they can no longer edit their 10th, 12th,
          UG or PG percentage themselves.
        </p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) onFile(file);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center transition ${
            dragOver ? 'border-primary-400 bg-primary-50' : 'border-border'
          }`}
        >
          <p className="text-sm text-subtle">Drag &amp; drop a CSV or Excel file here</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = '';
            }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? 'Importing…' : 'Choose file…'}
          </Button>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {result && (
          <div className="space-y-1 rounded-md bg-app p-3 text-sm">
            <p className="text-success">{result.updatedCount} students updated</p>
            {result.errorCount > 0 && (
              <div className="space-y-1">
                <p className="text-danger">{result.errorCount} rows failed</p>
                <ul className="space-y-0.5 text-xs text-subtle">
                  {result.errors.map((e) => (
                    <li key={`${e.row}-${e.message}`}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
