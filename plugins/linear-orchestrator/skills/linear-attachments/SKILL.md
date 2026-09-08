---
name: Linear Attachments
description: This skill should be used when uploading files to Linear, linking external URLs as attachments, or downloading existing attachments with auth. Activates on "linear attachment", "linear file upload", "fileUpload mutation", "attachmentLinkCreate".
version: 1.0.0
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Linear Attachments

References:
- Attachments overview: https://linear.app/developers/attachments
- File-storage auth: https://linear.app/developers/file-storage-authentication
- How-to upload: https://linear.app/developers/how-to-upload-a-file-to-linear

## Two flavours

| Type | Storage | Use case |
|------|---------|----------|
| File attachment | Linear S3 (pre-signed) | screenshots, logs, design files |
| Link attachment | External URL only | GitHub PR, Figma, Notion, Loom |

## File upload (3-step)

```ts
// 1. Reserve upload URL
const reservation = await client.fileUpload({
  contentType: "image/png",
  filename: "screenshot.png",
  size: file.length
});
// { uploadFile: { uploadUrl, headers: [{key,value}], assetUrl } }

// 2. PUT bytes
await fetch(reservation.uploadUrl, {
  method: "PUT",
  body: file,
  headers: Object.fromEntries(reservation.headers.map(h => [h.key, h.value]))
});

// 3. Attach to issue
await client.attachmentCreate({
  issueId,
  url: reservation.assetUrl,
  title: "Screenshot",
  contentType: "image/png"
});
```

Helper in `lib/attachment-upload.ts`:
```ts
export async function uploadFileToLinear(
  client: LinearClient,
  issueId: string,
  filePath: string,
  title?: string
): Promise<string>;  // returns attachment ID
```

## Multipart for large files

For files >50MB:
- Linear's pre-signed URL supports multipart S3 uploads
- Split into 5MB parts, PUT each with `partNumber` query param
- Complete with `POST ?uploads` to finalise

Most use cases stay under 50MB; only logs and video do this.

## Link attachments

```ts
await client.attachmentLinkCreate(issueId, "https://github.com/org/repo/pull/42", "PR #42");
```

Linear infers preview from URL pattern. Supported: GitHub PR / issue / commit, Figma, Notion, Loom, Vimeo, Slack thread, generic OG-rich pages.

## Download with auth

Asset URLs require the same Linear token in `Authorization: Bearer <token>`. Don't share these URLs publicly — they expire after 7 days but exposing during that window is a leak.

```ts
const res = await fetch(assetUrl, {
  headers: { Authorization: `Bearer ${process.env.LINEAR_API_KEY}` }
});
const buffer = Buffer.from(await res.arrayBuffer());
```

Or, mint a short-lived signed URL through your own service if you need to share with end users.

## Bridge fan-out

- **Harness Code**: file attachments are linked (not copied) to the linked PR via a comment with the asset URL — the URL is auth-required, so reviewers must be Linear members.
- **GitHub**: where Linear Diffs are enabled, PR context renders natively; attachments still link by asset URL.

## Security notes

- Validate content-type before declaring it (don't trust user input)
- Cap upload size at the layer above (usually 100MB)
- Strip EXIF from images if client-side is feasible
- Don't pass user file bytes through your backend; redirect them to Linear's pre-signed URL directly
