function normalizeText(value) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function digitsOnlyPhone(value) {
  const t = normalizeText(value);
  if (!t) return "";
  return t.replace(/[^\d]/g, "");
}

function splitMulti(value, options = {}) {
  const { preferredDelimiter = ",", allow = [",", ";", "|", "/", " - "] } = options;
  if (Array.isArray(value)) return value.map(normalizeText).filter(Boolean);
  const raw = normalizeText(value);
  if (!raw) return [];
  const delims = [preferredDelimiter, ...allow].filter(Boolean);
  for (const d of delims) {
    if (raw.includes(d)) {
      return raw
        .split(d)
        .map(normalizeText)
        .filter(Boolean);
    }
  }
  return [raw];
}

function parseYesNo(value) {
  const t = normalizeKey(value);
  if (!t) return false;
  return ["y", "yes", "true", "1"].includes(t);
}

function pickFirstExisting(row, keys) {
  for (const k of keys) {
    if (!k) continue;
    const v = row?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
}

module.exports = {
  normalizeText,
  normalizeKey,
  digitsOnlyPhone,
  splitMulti,
  parseYesNo,
  pickFirstExisting,
};

