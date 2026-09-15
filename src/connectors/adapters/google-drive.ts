import { z } from "zod";

import { AdapterError, capList, fetchJson, truncate } from "./adapter-shared";

const searchSchema = z.object({
  query: z.string().trim().min(1).max(500),
  limit: z.number().int().min(1).max(25).default(10),
});

const readFileSchema = z.object({
  fileId: z.string().trim().min(1).max(200),
});

// Google Docs/Sheets/Slides have no direct downloadable content — they must
// be exported to a concrete mime type via the `/export` endpoint instead of
// `alt=media`.
const GOOGLE_EXPORT_MIME: Record<string, string> = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
  "application/vnd.google-apps.presentation": "text/plain",
};

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

function headers(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

export async function runGoogleDriveAction(input: {
  accessToken: string;
  action: string;
  params: Record<string, unknown>;
}): Promise<unknown> {
  if (input.action === "search") {
    const params = searchSchema.parse(input.params);
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set(
      "q",
      `fullText contains '${params.query.replaceAll("'", "\\'")}' and trashed = false`,
    );
    url.searchParams.set("pageSize", String(params.limit));
    url.searchParams.set("fields", "files(id,name,mimeType,webViewLink)");
    const data = (await fetchJson(url.toString(), {
      headers: headers(input.accessToken),
    })) as { files?: DriveFile[] };
    return {
      files: capList(
        (data.files ?? []).map((file) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          url: file.webViewLink ?? null,
        })),
        params.limit,
      ),
    };
  }
  if (input.action === "read-file") {
    const params = readFileSchema.parse(input.params);
    const metadata = (await fetchJson(
      `https://www.googleapis.com/drive/v3/files/${params.fileId}?fields=id,name,mimeType`,
      { headers: headers(input.accessToken) },
    )) as DriveFile;
    const exportMime = GOOGLE_EXPORT_MIME[metadata.mimeType];
    const contentUrl = exportMime
      ? `https://www.googleapis.com/drive/v3/files/${params.fileId}/export?mimeType=${encodeURIComponent(exportMime)}`
      : `https://www.googleapis.com/drive/v3/files/${params.fileId}?alt=media`;
    const response = await fetch(contentUrl, { headers: headers(input.accessToken) });
    if (!response.ok) {
      throw new AdapterError(`Could not read this Drive file (${response.status}).`);
    }
    const text = await response.text();
    return {
      id: metadata.id,
      name: metadata.name,
      mimeType: metadata.mimeType,
      content: truncate(text),
    };
  }
  throw new AdapterError(`Unknown Google Drive action "${input.action}".`);
}
