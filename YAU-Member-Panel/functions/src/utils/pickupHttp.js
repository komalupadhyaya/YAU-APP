function parseOptionalBoolean(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return null;
}

function requireBodyFields(body, fields) {
  const missing = [];
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === "") {
      missing.push(f);
    }
  }
  return missing;
}

function getHeader(req, name) {
  const val = req.headers[name.toLowerCase()];
  if (Array.isArray(val)) return val[0];
  return val;
}

module.exports = {
  parseOptionalBoolean,
  requireBodyFields,
  getHeader,
};

