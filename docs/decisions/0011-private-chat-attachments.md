# Private chat attachments

Status: bounded text extraction is implemented for private conversations and
private Projects. Image analysis, spreadsheet extraction, and semantic
retrieval remain pending.

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

The upload slice validates an allowlisted type and a 10 MB byte bound before
storage, uses a server-derived random pathname that cannot collide across
organizations or conversations, and deletes Blob bytes before metadata. If Blob
cleanup fails, metadata remains so cleanup can be retried. The chat composer
shows owned attachments and opens them through the authenticated Pilot route.
For text, Markdown, CSV, PDF, and DOCX files, Pilot reads owner-authorized
private Blob bytes at message time, bounds the combined context, and adds
explicitly untrusted excerpts to the server-built runtime instruction packet.
`unpdf` extracts PDF text and Mammoth extracts DOCX raw text; neither parser's
output is rendered as HTML. Blob URLs and browser-supplied file metadata never
reach Pilot AI. The agent is told not to follow instructions from attachment
text. Spreadsheet and image attachments remain storage and delivery features
until their extraction contracts exist.

Project files use the same private Blob boundary, but keep distinct
creator-scoped Project metadata in Neon. Pilot checks that the current private
chat is still associated with that same owned Project immediately before it
reads a file. Their excerpts share the existing five-file and character limits
with chat attachments, and remain explicitly untrusted. Deleting a Project
removes each private Blob before its database metadata can cascade; a Blob
failure preserves the Project and metadata so cleanup can be retried. This is
bounded direct file context, not semantic knowledge or retrieval.

## Sources checked on 2026-09-10

- [Vercel private Blob storage](https://vercel.com/docs/vercel-blob/private-storage)
  — private objects require authenticated reads and should be served through an
  application route that implements authorization.
- [Vercel Blob security](https://vercel.com/docs/vercel-blob/security) — private
  Blob URLs are not public delivery URLs.
- [Vercel Blob client uploads](https://vercel.com/docs/vercel-blob/client-upload)
  — browser uploads require a server-side token exchange; this product will use
  a server-upload first slice while it enforces size and ownership checks.
