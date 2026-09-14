import assert from "node:assert/strict";
import test from "node:test";

import { isHtmlDocumentText } from "@/ai/runtime-contract";

test("a Next.js/Vercel error page is recognized as an HTML document", () => {
  const errorPage = `<!DOCTYPE html><html><head><title>500: This page couldn't load</title></head><body>Server error</body></html>`;
  assert.equal(isHtmlDocumentText(errorPage), true);
});

test("a bare <html> document without a doctype is recognized", () => {
  assert.equal(isHtmlDocumentText("<html><body>error</body></html>"), true);
});

test("leading whitespace before the doctype is tolerated", () => {
  assert.equal(isHtmlDocumentText("\n\n  <!doctype html><html></html>"), true);
});

test("a normal markdown reply is not flagged", () => {
  assert.equal(
    isHtmlDocumentText("Here's a summary:\n\n1. First point\n2. Second"),
    false,
  );
});

test("a reply that merely mentions HTML in prose is not flagged", () => {
  assert.equal(
    isHtmlDocumentText("You can use `<html>` as the root tag in a page."),
    false,
  );
});
