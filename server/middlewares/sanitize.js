// NoSQL-injection guard (dependency-free equivalent of express-mongo-sanitize).
// Attackers send JSON like {"email": {"$gt": ""}} hoping the object lands in
// a Mongo query as an operator. Any key that starts with "$" or contains "."
// is an operator/path in Mongo syntax and never a legitimate field name in
// this API, so such keys are stripped from body, query and params before
// anything else touches them. Controllers additionally type-check the
// fields they read (defence in depth).
const isDangerousKey = (key) => key.startsWith("$") || key.includes(".");

function scrub(value) {
  if (Array.isArray(value)) {
    for (const item of value) scrub(item);
    return;
  }
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (isDangerousKey(key)) {
        delete value[key];
      } else {
        scrub(value[key]);
      }
    }
  }
}

export function sanitizeMongo(req, res, next) {
  if (req.body) scrub(req.body);
  if (req.query) scrub(req.query);
  if (req.params) scrub(req.params);
  next();
}
