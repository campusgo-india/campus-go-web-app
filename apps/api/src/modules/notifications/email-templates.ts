// Formal email body renderer for the 14 student-facing notification emails —
// matches the placement-cell mail template style: a greeting, a short intro,
// a structured fact table (Company / Position / Date etc.), an optional call
// to action, and a signed closing. Every notify()/notifyMany() call site for
// students builds one of these via renderFormalEmail() and passes it as
// NotifyParams.email; the in-app notification feed keeps its own short
// title/body untouched — this is the EMAIL body only.

// Call sites don't have the college's NAME on hand (only its id) and fetching
// it per call site would mean N duplicate lookups — they pass this token as
// `collegeName` instead, and NotificationsService substitutes the real name
// once, right before sending, having already loaded it for the envelope.
export const COLLEGE_NAME_TOKEN = '{{COLLEGE_NAME}}';

export interface FormalEmailField {
  label: string;
  value: string;
}

export interface FormalEmailInput {
  collegeName: string;
  /** Defaults to "Dear Students,". */
  greeting?: string;
  /** Opening paragraph. */
  intro: string;
  /** Structured facts block (Company, Position, CTC, Date, ...). */
  fields?: FormalEmailField[];
  /** Extra line after the facts block, e.g. "Please go through the JD carefully." */
  note?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Defaults to "Placement Cell". */
  signOffName?: string;
}

/** Escapes a value dropped into the HTML template — every field above is
 * either our own copy or user-entered college/job data, never safe to trust
 * verbatim in an email client. */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderFormalEmail(input: FormalEmailInput): string {
  const greeting = esc(input.greeting ?? 'Dear Students,');
  const fieldsHtml = input.fields?.length
    ? `<table style="margin:18px 0;border-collapse:collapse;">${input.fields
        .map(
          (f) =>
            `<tr><td style="padding:3px 14px 3px 0;color:#4A5468;font-weight:600;white-space:nowrap;vertical-align:top;">${esc(f.label)}:</td><td style="padding:3px 0;color:#1B2333;">${esc(f.value)}</td></tr>`,
        )
        .join('')}</table>`
    : '';
  const cta = input.ctaUrl
    ? `<p style="margin:22px 0;"><a href="${esc(input.ctaUrl)}" style="display:inline-block;background:#3B6EF5;color:#ffffff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${esc(input.ctaLabel ?? 'View details')}</a></p>`
    : '';
  const note = input.note ? `<p style="color:#4A5468;margin:16px 0;">${esc(input.note)}</p>` : '';

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#1B2333;max-width:560px;">
  <p>${greeting}</p>
  <p>${esc(input.intro)}</p>
  ${fieldsHtml}
  ${note}
  ${cta}
  <p style="margin-top:28px;color:#1B2333;">
    Regards,<br/>
    ${esc(input.signOffName ?? 'Placement Cell')}<br/>
    ${esc(input.collegeName)}
  </p>
</div>`;
}
