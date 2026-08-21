'use client';

import { useEffect, useState } from 'react';
import { listMySchools, type CollegeSchool } from '../lib/courses';
import { listBatches, type TrainingBatch } from '../lib/training';

/**
 * Shared by the New Assessment / New Session forms: pick which programmes
 * and/or batches this should target. Leaving both empty (the default) keeps
 * it visible to every active student at the college.
 */
export function TrainingTargetPicker({
  programmes,
  batchIds,
  onChangeProgrammes,
  onChangeBatchIds,
}: {
  programmes: string[];
  batchIds: string[];
  onChangeProgrammes: (programmes: string[]) => void;
  onChangeBatchIds: (batchIds: string[]) => void;
}) {
  const [schools, setSchools] = useState<CollegeSchool[]>([]);
  const [batches, setBatches] = useState<TrainingBatch[]>([]);

  useEffect(() => {
    listMySchools()
      .then(setSchools)
      .catch(() => {});
    listBatches()
      .then(setBatches)
      .catch(() => {});
  }, []);

  function toggleProgramme(b: string) {
    onChangeProgrammes(
      programmes.includes(b) ? programmes.filter((x) => x !== b) : [...programmes, b],
    );
  }

  function toggleBatch(id: string) {
    onChangeBatchIds(batchIds.includes(id) ? batchIds.filter((x) => x !== id) : [...batchIds, id]);
  }

  const untargeted = programmes.length === 0 && batchIds.length === 0;

  return (
    <div className="space-y-3 rounded-md border border-border bg-app p-3">
      <p className="text-xs font-medium text-subtle">
        Target audience — {untargeted ? 'everyone (default)' : 'restricted to what you select below'}
      </p>

      {schools.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-strong">By programme</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {schools.map((c) =>
              (c.programmes.length > 0 ? c.programmes : [c.name]).map((b) => (
                <label key={`${c.id}-${b}`} className="flex items-center gap-1.5 text-sm text-body">
                  <input
                    type="checkbox"
                    checked={programmes.includes(b)}
                    onChange={() => toggleProgramme(b)}
                  />
                  {b}
                </label>
              )),
            )}
          </div>
        </div>
      )}

      {batches.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-strong">By batch</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {batches.map((b) => (
              <label key={b.id} className="flex items-center gap-1.5 text-sm text-body">
                <input
                  type="checkbox"
                  checked={batchIds.includes(b.id)}
                  onChange={() => toggleBatch(b.id)}
                />
                {b.name} ({b.memberCount})
              </label>
            ))}
          </div>
        </div>
      )}

      {schools.length === 0 && batches.length === 0 && (
        <p className="text-xs text-subtle">
          No school catalog or batches set up yet — this will be visible to everyone.
        </p>
      )}
    </div>
  );
}
