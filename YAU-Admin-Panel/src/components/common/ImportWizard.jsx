import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Table, { TableRow, TableCell } from './Table';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const normalizeHeader = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '')
    .replace(/[^a-z0-9]/g, '');

const buildHeaderIndex = (row) => {
  const keys = Object.keys(row || {});
  const map = new Map();
  keys.forEach((k) => map.set(normalizeHeader(k), k));
  return map;
};

const pickHeader = (headerIndex, candidates = []) => {
  for (const c of candidates) {
    const hit = headerIndex.get(normalizeHeader(c));
    if (hit) return hit;
  }
  return '';
};

const readCsvOrXlsx = async (file) => {
  const fileName = file?.name?.toLowerCase?.() || '';
  const isCsv = fileName.endsWith('.csv');
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
  if (!isCsv && !isExcel) throw new Error('Please upload a CSV or Excel file (.csv, .xlsx, .xls).');

  if (isCsv) {
    return await new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results?.data || []),
        error: (err) => reject(err),
      });
    });
  }

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read Excel file'));
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames?.[0];
        if (!firstSheetName) return resolve([]);
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        resolve(rows);
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < (arr || []).length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/**
 * Reusable import wizard:
 * - Upload file (CSV/XLSX)
 * - Preview first rows
 * - Column mapping (auto-mapped with candidates)
 * - Settings (mode, chunk size)
 * - Run import with progress + error list
 *
 * Props:
 * - isOpen, onClose, title
 * - fields: [{ key, label, required?, candidates?: string[] }]
 * - defaultMode?: 'upsert' | 'create_only'
 * - onImportChunk: async ({ rows, columnMap, settings }) => returns { created?, updated?, errors?: [], results?: [] }
 * - preflight?: ({ rows, columnMap, settings }) => string|null (error message to block)
 */
const ImportWizard = ({
  isOpen,
  onClose,
  title = 'Import',
  fields = [],
  defaultMode = 'upsert',
  onImportChunk,
  preflight,
}) => {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [columnMap, setColumnMap] = useState({});
  const [mode, setMode] = useState(defaultMode);
  const [chunkSize, setChunkSize] = useState(50);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0, chunkIndex: 0, chunkCount: 0 });
  const [summary, setSummary] = useState({ created: 0, updated: 0, errors: [] });

  const reset = () => {
    setStep(1);
    setFileName('');
    setRawRows([]);
    setHeaders([]);
    setColumnMap({});
    setMode(defaultMode);
    setChunkSize(50);
    setRunning(false);
    setProgress({ processed: 0, total: 0, chunkIndex: 0, chunkCount: 0 });
    setSummary({ created: 0, updated: 0, errors: [] });
  };

  const close = () => {
    reset();
    onClose?.();
  };

  const previewRows = useMemo(() => (rawRows || []).slice(0, 20), [rawRows]);

  const handleFile = async (file) => {
    const rows = await readCsvOrXlsx(file);
    const cleaned = (rows || []).filter((r) => r && Object.values(r).some((v) => String(v ?? '').trim() !== ''));
    if (!cleaned.length) throw new Error('No rows found in file');

    const first = cleaned[0] || {};
    const headerKeys = Object.keys(first);
    setRawRows(cleaned);
    setHeaders(headerKeys);
    setFileName(file?.name || 'file');

    const idx = buildHeaderIndex(first);
    const auto = {};
    (fields || []).forEach((f) => {
      const candidates = Array.isArray(f.candidates) ? f.candidates : [f.label];
      auto[f.key] = pickHeader(idx, candidates) || '';
    });
    setColumnMap(auto);
    setStep(2);
  };

  const requiredMissing = useMemo(() => {
    const missing = [];
    (fields || []).forEach((f) => {
      if (f.required && !columnMap?.[f.key]) missing.push(f.label);
    });
    return missing;
  }, [fields, columnMap]);

  const runImport = async () => {
    if (!onImportChunk) return;
    if (requiredMissing.length) return;

    const settings = { mode, chunkSize };
    const msg = preflight?.({ rows: rawRows, columnMap, settings });
    if (msg) {
      alert(msg);
      return;
    }

    setRunning(true);
    setSummary({ created: 0, updated: 0, errors: [] });
    const parts = chunk(rawRows, Math.max(1, Number(chunkSize) || 50));
    const total = rawRows.length;
    let created = 0;
    let updated = 0;
    const errors = [];

    for (let i = 0; i < parts.length; i++) {
      setProgress({
        processed: Math.min(i * chunkSize, total),
        total,
        chunkIndex: i + 1,
        chunkCount: parts.length,
      });
      // eslint-disable-next-line no-await-in-loop
      const res = await onImportChunk({ rows: parts[i], columnMap, settings });
      created += Number(res?.created || 0);
      updated += Number(res?.updated || 0);
      (res?.errors || []).forEach((e) => errors.push(e));
    }

    setProgress({ processed: total, total, chunkIndex: parts.length, chunkCount: parts.length });
    setSummary({ created, updated, errors });
    setRunning(false);
    setStep(5);
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title={title} size="xl">
      <div className="space-y-4">
        {/* Step indicator */}
        <div className="text-sm text-gray-600">
          Step {step} of 5 {fileName ? `• ${fileName}` : ''}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <div className="text-sm text-gray-700">Upload an Excel/CSV file to import.</div>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  await handleFile(f);
                } catch (err) {
                  alert(err?.message || String(err));
                }
              }}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="text-sm text-gray-700">Preview (first 20 rows)</div>
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <TableRow>
                    {headers.slice(0, 8).map((h) => (
                      <TableCell key={h} isHeader className="text-xs font-semibold text-gray-500">
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </thead>
                <tbody>
                  {previewRows.map((r, idx) => (
                    <TableRow key={idx}>
                      {headers.slice(0, 8).map((h) => (
                        <TableCell key={h}>{String(r?.[h] ?? '')}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setStep(1)} disabled={running}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={running}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="text-sm text-gray-700">Column mapping</div>

            {requiredMissing.length ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                Missing required mappings: <span className="font-semibold">{requiredMissing.join(', ')}</span>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(fields || []).map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {f.label} {f.required ? <span className="text-red-500">*</span> : null}
                  </label>
                  <select
                    value={columnMap?.[f.key] || ''}
                    onChange={(e) => setColumnMap((prev) => ({ ...(prev || {}), [f.key]: e.target.value }))}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">(not mapped)</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setStep(2)} disabled={running}>
                Back
              </Button>
              <Button onClick={() => setStep(4)} disabled={running || requiredMissing.length > 0}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="text-sm text-gray-700">Import settings</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="upsert">Upsert</option>
                  <option value="create_only">Create only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chunk size</label>
                <input
                  type="number"
                  min={1}
                  value={chunkSize}
                  onChange={(e) => setChunkSize(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">Recommended: 50 rows per request</p>
              </div>
            </div>

            {running ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                Processing {progress.processed} / {progress.total} (chunk {progress.chunkIndex} of {progress.chunkCount})
                <div className="mt-2 h-2 w-full bg-gray-200 rounded">
                  <div
                    className="h-2 bg-primary-500 rounded"
                    style={{
                      width: `${progress.total ? Math.round((progress.processed / progress.total) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setStep(3)} disabled={running}>
                Back
              </Button>
              <Button onClick={runImport} disabled={running || requiredMissing.length > 0}>
                Run Import
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              Import complete. Created: <span className="font-semibold">{summary.created}</span> • Updated:{' '}
              <span className="font-semibold">{summary.updated}</span> • Errors:{' '}
              <span className="font-semibold">{summary.errors.length}</span>
            </div>

            {summary.errors.length ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-800">Errors</div>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">#</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.errors.slice(0, 200).map((e, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">{idx + 1}</td>
                          <td className="px-3 py-2">{e?.message || e?.error || JSON.stringify(e)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {summary.errors.length > 200 ? (
                  <div className="text-xs text-gray-500">Showing first 200 errors</div>
                ) : null}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button onClick={close}>Done</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImportWizard;

