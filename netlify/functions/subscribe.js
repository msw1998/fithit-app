/**
 * FitHit Waitlist Subscribe — Netlify Function
 *
 * POST /.netlify/functions/subscribe
 * Body: { email: string, interest: "individual" | "gym" | "investor" }
 *
 * Storage backends (choose one, uncomment the relevant section):
 *   A) Airtable       — best for quick setup, spreadsheet-style view
 *   B) Supabase       — best for SQL/scaling
 *   C) Resend email   — forward signups to your inbox
 *   D) Fallback       — logs only (default, works without setup)
 *
 * Set environment variables in Netlify → Site settings → Environment variables.
 */

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  // ── CORS preflight ───────────────────────────────────────────
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Parse & validate ─────────────────────────────────────────
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { email, interest = 'individual' } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid email required' }) };
  }

  const VALID_INTERESTS = ['individual', 'gym', 'investor'];
  const safeInterest = VALID_INTERESTS.includes(interest) ? interest : 'individual';

  const entry = {
    email: email.toLowerCase().trim(),
    interest: safeInterest,
    signedUpAt: new Date().toISOString(),
    source: event.headers['referer'] || 'direct',
  };

  // ── Storage backend ──────────────────────────────────────────
  let stored = false;

  // ─────────────────────────────────────────────────────────────
  // OPTION A: Airtable
  // Required env vars: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME
  // ─────────────────────────────────────────────────────────────
  if (process.env.AIRTABLE_API_KEY && !stored) {
    try {
      const res = await fetch(
        `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_TABLE_NAME || 'Waitlist')}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            records: [{
              fields: {
                Email:      entry.email,
                Interest:   entry.interest,
                'Signed Up': entry.signedUpAt,
                Source:     entry.source,
              },
            }],
          }),
        }
      );
      if (res.ok) { stored = true; console.log('[FitHit] Saved to Airtable:', entry.email); }
      else { console.error('[FitHit] Airtable error:', await res.text()); }
    } catch (err) {
      console.error('[FitHit] Airtable exception:', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // OPTION B: Supabase
  // Required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY
  // Table: CREATE TABLE waitlist (id uuid DEFAULT gen_random_uuid(), email text UNIQUE, interest text, signed_up_at timestamptz, source text);
  // ─────────────────────────────────────────────────────────────
  if (process.env.SUPABASE_URL && !stored) {
    try {
      const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/waitlist`, {
        method: 'POST',
        headers: {
          'apikey':          process.env.SUPABASE_SERVICE_KEY,
          'Authorization':   `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'Content-Type':    'application/json',
          'Prefer':          'return=minimal',
        },
        body: JSON.stringify({
          email:        entry.email,
          interest:     entry.interest,
          signed_up_at: entry.signedUpAt,
          source:       entry.source,
        }),
      });
      if (res.ok || res.status === 409) { // 409 = duplicate, still OK
        stored = true;
        console.log('[FitHit] Saved to Supabase:', entry.email);
      } else {
        console.error('[FitHit] Supabase error:', await res.text());
      }
    } catch (err) {
      console.error('[FitHit] Supabase exception:', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // OPTION C: Resend — forward signup to your inbox
  // Required env vars: RESEND_API_KEY, NOTIFY_EMAIL (your inbox)
  // ─────────────────────────────────────────────────────────────
  if (process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'FitHit Waitlist <noreply@fithit.io>',
          to:   [process.env.NOTIFY_EMAIL || 'hello@fithit.io'],
          subject: `New Waitlist Signup: ${entry.email}`,
          html: `<p><strong>Email:</strong> ${entry.email}<br/><strong>Interest:</strong> ${entry.interest}<br/><strong>Signed up:</strong> ${entry.signedUpAt}</p>`,
        }),
      });
    } catch (err) {
      console.error('[FitHit] Resend exception:', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // OPTION D: Fallback — just log (always runs as a safety net)
  // ─────────────────────────────────────────────────────────────
  if (!stored) {
    console.log('[FitHit] Waitlist signup (no storage configured):', JSON.stringify(entry));
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, message: 'You\'re on the list!' }),
  };
};
