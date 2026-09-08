/**
 * Linear file uploads and issue attachments.
 *
 * Reference: https://linear.app/developers/how-to-upload-a-file-to-linear
 *
 * Uploading is a three-step dance, and the middle step is the one people get
 * wrong: the PUT to the pre-signed URL must replay **every header Linear
 * returned**, verbatim. Dropping or reordering them yields a 403 from the
 * storage backend that looks nothing like a Linear error.
 */

const FILE_UPLOAD = /* GraphQL */ `
  mutation FileUpload($contentType: String!, $filename: String!, $size: Int!) {
    fileUpload(contentType: $contentType, filename: $filename, size: $size) {
      success
      uploadFile {
        assetUrl
        uploadUrl
        contentType
        filename
        size
        headers { key value }
      }
    }
  }
`;

const ATTACHMENT_CREATE = /* GraphQL */ `
  mutation AttachmentCreate($input: AttachmentCreateInput!) {
    attachmentCreate(input: $input) {
      success
      attachment { id url title subtitle }
    }
  }
`;

/**
 * Request a pre-signed upload slot.
 *
 * @param {import("./linear-client.mjs").LinearClient} client
 * @param {{ filename: string, contentType: string, size: number }} file
 */
export async function prepareUpload(client, file) {
  if (!Number.isInteger(file.size) || file.size <= 0) {
    throw new Error("prepareUpload requires a positive integer `size` in bytes.");
  }
  const data = await client.request(FILE_UPLOAD, {
    contentType: file.contentType,
    filename: file.filename,
    size: file.size,
  });
  const payload = data?.fileUpload;
  if (!payload?.success || !payload.uploadFile) {
    throw new Error(`Linear refused the upload slot for ${file.filename}.`);
  }
  return payload.uploadFile;
}

/**
 * Upload bytes to the pre-signed URL.
 *
 * @param {{ uploadUrl: string, contentType: string, headers: Array<{key: string, value: string}> }} slot
 * @param {Buffer|Uint8Array} bytes
 * @param {{ fetch?: typeof fetch }} [opts]
 */
export async function uploadBytes(slot, bytes, opts = {}) {
  const doFetch = opts.fetch ?? globalThis.fetch;
  /** @type {Record<string,string>} */
  const headers = { "Content-Type": slot.contentType };
  // Replay Linear's headers exactly — the signature covers them.
  for (const { key, value } of slot.headers ?? []) headers[key] = value;

  const res = await doFetch(slot.uploadUrl, { method: "PUT", headers, body: bytes });
  if (!res.ok) {
    throw new Error(`Upload to storage failed: ${res.status} ${await res.text()}`);
  }
}

/**
 * Attach a URL to an issue.
 *
 * Attachments are how a non-GitHub host surfaces a pull request on a Linear
 * issue: Linear's native Diffs/Reviews product is GitHub-only, so the Harness
 * path links the PR here instead.
 *
 * @param {import("./linear-client.mjs").LinearClient} client
 * @param {object} input
 * @param {string} input.issueId
 * @param {string} input.url
 * @param {string} input.title
 * @param {string} [input.subtitle]
 * @param {string} [input.iconUrl]
 * @param {Record<string, unknown>} [input.metadata]
 */
export async function attachToIssue(client, input) {
  const data = await client.request(ATTACHMENT_CREATE, { input });
  const payload = data?.attachmentCreate;
  if (!payload?.success) throw new Error(`Failed to attach ${input.url} to ${input.issueId}.`);
  return payload.attachment;
}

/**
 * Full upload-then-attach flow.
 *
 * @param {import("./linear-client.mjs").LinearClient} client
 * @param {{ issueId: string, filename: string, contentType: string, bytes: Buffer, title?: string }} params
 * @param {{ fetch?: typeof fetch }} [opts]
 */
export async function uploadAndAttach(client, params, opts = {}) {
  const slot = await prepareUpload(client, {
    filename: params.filename,
    contentType: params.contentType,
    size: params.bytes.length,
  });
  await uploadBytes(slot, params.bytes, opts);
  return attachToIssue(client, {
    issueId: params.issueId,
    url: slot.assetUrl,
    title: params.title ?? params.filename,
  });
}
