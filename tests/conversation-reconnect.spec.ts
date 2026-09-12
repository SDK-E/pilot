import { test } from "@playwright/test";

test("AC-08-01: cut network then reload finds messages and a single run", () => {
  test.skip(
    true,
    "BLOCKED: requires an authenticated WorkOS browser session and a running conversation.",
  );
});
