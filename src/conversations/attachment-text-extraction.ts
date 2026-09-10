import "server-only";

import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

const plainTextContentTypes = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
]);

const docxContentType =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const textExtractableContentTypes = new Set([
  ...plainTextContentTypes,
  "application/pdf",
  docxContentType,
]);

export function isTextExtractableContentType(contentType: string) {
  return textExtractableContentTypes.has(contentType);
}

export async function extractAttachmentText(input: {
  contentType: string;
  bytes: Uint8Array;
}) {
  if (plainTextContentTypes.has(input.contentType)) {
    return new TextDecoder().decode(input.bytes);
  }

  if (input.contentType === "application/pdf") {
    const document = await getDocumentProxy(input.bytes);
    const result = await extractText(document, { mergePages: true });
    return result.text;
  }

  if (input.contentType === docxContentType) {
    const result = await mammoth.extractRawText({
      buffer: Buffer.from(input.bytes),
    });
    return result.value;
  }

  return undefined;
}
