import { Transform } from 'class-transformer';
import { toTitleCase } from '@campusgo/shared';

/**
 * Coerce a blank string to `undefined` so `@IsOptional()` treats an empty
 * optional field as absent (otherwise a submitted "" would fail format checks
 * like `@Matches`). Apply BEFORE `@IsOptional()`.
 */
export const EmptyToUndefined = () =>
  Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value));

/** Title-case a free-text location field (city, state): "bengaluru" → "Bengaluru". */
export const TitleCase = () =>
  Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? toTitleCase(value) : value,
  );

/**
 * Ensure a user-typed URL has a protocol. Without this, "linkedin.com/in/x"
 * gets stored as-is and an <a href="linkedin.com/in/x"> resolves as a RELATIVE
 * path on our own domain — a 404, not the intended external site.
 */
export const NormalizeUrl = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return value;
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  });
