/**
 * Pickup endpoint smoke test (Node 18+ required for global fetch)
 *
 * Usage (PowerShell):
 *   $env:PICKUP_BASE_URL="http://127.0.0.1:5001/yau-app/us-central1/apis"
 *   $env:ADMIN_ID="YOUR_ADMIN_UID"
 *   node scripts/pickup-smoke-test.mjs
 *
 * Bulk delete (DANGEROUS):
 *   $env:ROSTER_IDS="id1,id2"
 *   $env:DELETE_STUDENTS="true"
 *   node scripts/pickup-smoke-test.mjs
 */

const baseUrl = (process.env.PICKUP_BASE_URL || '').replace(/\/+$/, '');
if (!baseUrl) {
  console.error('Missing PICKUP_BASE_URL env var (example: http://127.0.0.1:5001/yau-app/us-central1/apis)');
  process.exit(1);
}

const adminId = process.env.ADMIN_ID || '';

async function api(path, { method = 'GET', headers = {}, body } = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(adminId ? { 'x-admin-id': adminId } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text().catch(() => '');
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { message: text };
  }

  if (!res.ok) {
    throw new Error(json?.error || json?.message || `HTTP ${res.status}: ${res.statusText}`);
  }
  return json;
}

async function main() {
  console.log('Base:', baseUrl);
  console.log('Admin header:', adminId ? 'x-admin-id set' : 'x-admin-id NOT set');

  // 1) List rosters (safe)
  const rosters = await api('/pickup/rosters', { method: 'GET' });
  console.log('GET /pickup/rosters ->', rosters?.data?.length ?? rosters?.data ?? rosters);

  // 2) Bulk delete (optional; only when explicitly requested)
  const rosterIdsRaw = (process.env.ROSTER_IDS || '').trim();
  if (rosterIdsRaw) {
    const rosterIds = rosterIdsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const deleteStudents = String(process.env.DELETE_STUDENTS || '').toLowerCase() === 'true';

    console.log('About to POST /pickup/rosters/bulk-delete with:', { rosterIds, deleteStudents });
    const result = await api('/pickup/rosters/bulk-delete', {
      method: 'POST',
      body: { rosterIds, deleteStudents },
    });
    console.log('POST /pickup/rosters/bulk-delete ->', result);
  } else {
    console.log('Skipping bulk delete (set ROSTER_IDS="id1,id2" to run it).');
  }
}

main().catch((err) => {
  console.error('Smoke test failed:', err?.message || err);
  process.exit(1);
});

