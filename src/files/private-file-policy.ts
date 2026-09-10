const maximumPrivateFileBytes = 10 * 1024 * 1024;

const acceptedPrivateFileTypes = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function isAcceptedPrivateFile(file: File) {
  return (
    acceptedPrivateFileTypes.has(file.type) &&
    file.size >= 1 &&
    file.size <= maximumPrivateFileBytes
  );
}

export function safePrivateFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || "upload";
}
