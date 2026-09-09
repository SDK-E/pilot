# Private chat attachments

Status: accepted implementation boundary; no upload surface is enabled yet.

Attachments belong to the creator-scoped Pilot conversation that received them.
Pilot must persist attachment metadata in Neon with the organization, owner,
conversation, immutable blob pathname, media type, byte count, and lifecycle
timestamps. It must never use a Blob URL supplied by a browser as authority.

The production store is Vercel private Blob store
`pilot-private-files-production`. Files are private at rest and must be written,
read, and deleted only by Pilot server code after WorkOS authentication and the
existing organization, worker, conversation, and creator checks. A private Blob
URL is not returned as a public application URL; an authenticated Pilot route
streams the stored object after it reloads authorized metadata.

The first upload slice must validate an allowlisted type and bounded byte count
before storage, use a server-derived pathname that cannot collide across
organizations or conversations, delete the Blob when its metadata is deleted,
and preserve metadata when deletion is uncertain so a cleanup can be retried.
It must not send a file, extracted text, Blob URL, filename, or content to
Pilot AI until a separate typed ingestion and deletion contract exists.

## Sources checked on 2026-09-10

- [Vercel private Blob storage](https://vercel.com/docs/vercel-blob/private-storage)
  — private objects require authenticated reads and should be served through an
  application route that implements authorization.
- [Vercel Blob security](https://vercel.com/docs/vercel-blob/security) — private
  Blob URLs are not public delivery URLs.
- [Vercel Blob client uploads](https://vercel.com/docs/vercel-blob/client-upload)
  — browser uploads require a server-side token exchange; this product will use
  a server-upload first slice while it enforces size and ownership checks.
