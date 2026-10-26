import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 — the optional second video store (see
// lecture.model.js provider field). R2 speaks the S3 API, so this is
// the stock AWS SDK pointed at the account's R2 endpoint.
//
// Configuration is five environment variables; when ANY of them is
// missing the feature is simply off and uploads keep using Cloudinary
// exactly as before (validateEnv lists them as optional). Credentials
// live only in the server environment — never in code, never sent to
// the client. The client receives a short-lived presigned PUT URL and
// uploads the file straight to R2; video bytes never pass through this
// server.
const REQUIRED_ENV = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_BASE_URL",
];

export const isR2Configured = () =>
  REQUIRED_ENV.every((name) => !!process.env[name]);

let cachedClient = null;
const getClient = () => {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return cachedClient;
};

// Playback URL for a stored key: the public base (a custom domain or
// public bucket URL the owner configured) + the key.
export const getR2PublicUrl = (key) =>
  `${String(process.env.R2_PUBLIC_BASE_URL).replace(/\/+$/, "")}/${key}`;

// A presigned PUT URL the browser can upload one file to directly.
// Short-lived on purpose — it is a capability, not a credential.
export const createPresignedPutUrl = async (key, contentType) => {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getClient(), command, { expiresIn: 900 });
};

// Best-effort delete (mirrors the Cloudinary delete contract: log and
// swallow provider errors so a storage problem can never strand a
// half-deleted lecture record).
export const deleteR2Object = async (key) => {
  if (!isR2Configured() || !key) return;
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key })
    );
  } catch (error) {
    console.error("R2 delete failed:", String(error?.message || "").slice(0, 200));
  }
};
