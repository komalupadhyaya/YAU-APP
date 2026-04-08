const crypto = require("crypto");

const ITERATIONS = 120000;
const KEYLEN = 32;
const DIGEST = "sha256";

function hashPassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("Password is required");
  }
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST);
  return {
    salt: salt.toString("base64"),
    hash: hash.toString("base64"),
    iterations: ITERATIONS,
    keylen: KEYLEN,
    digest: DIGEST,
  };
}

function verifyPassword(password, stored) {
  if (!stored || !stored.salt || !stored.hash) return false;
  const iterations = stored.iterations || ITERATIONS;
  const keylen = stored.keylen || KEYLEN;
  const digest = stored.digest || DIGEST;

  const salt = Buffer.from(stored.salt, "base64");
  const expected = Buffer.from(stored.hash, "base64");
  const actual = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest);
  // timingSafeEqual requires same length
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

module.exports = {
  hashPassword,
  verifyPassword,
};

