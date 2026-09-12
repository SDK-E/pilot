import assert from "node:assert";
import test from "node:test";
import {
  classifyAction,
  checkPolicyClass,
  isAutoClassifierSignal,
  POLICY_CLASSES,
} from "@/approvals/policy-classes";

test("policy-classes: read action classified as read", () => {
  assert.strictEqual(classifyAction("chat:123", "read:conversation"), "read");
});

test("policy-classes: external_write for publish_pr", () => {
  assert.strictEqual(classifyAction("repo:x", "publish_pr"), "external_write");
});

test("policy-classes: destructive for delete", () => {
  assert.strictEqual(
    classifyAction("chat:123", "delete:conversation"),
    "destructive",
  );
});

test("policy-classes: financial for financial actions", () => {
  assert.strictEqual(
    classifyAction("acct:1", "financial:transfer"),
    "financial",
  );
});

test("policy-classes: deployment for deploy actions", () => {
  assert.strictEqual(
    classifyAction("proj:1", "deploy:production"),
    "deployment",
  );
});

test("policy-classes: unknown action defaults to external_write", () => {
  assert.strictEqual(classifyAction("x", "migrate_database"), "external_write");
});

test("policy-classes: auto-classifier is a signal only", () => {
  assert.strictEqual(isAutoClassifierSignal("auto-classifier"), true);
  assert.strictEqual(isAutoClassifierSignal("read:conversation"), false);
  assert.strictEqual(isAutoClassifierSignal("publish_pr"), false);
});

test("policy-classes: read can auto-approve with approval:decide scope", () => {
  const result = checkPolicyClass(
    ["approval:decide"],
    "read:conversation",
    false,
  );
  assert.strictEqual(result.decision, "allow");
  assert.strictEqual(result.class, "read");
  assert.strictEqual(result.requiresApproval, false);
});

test("policy-classes: external_write requires grant", () => {
  const result = checkPolicyClass(["approval:decide"], "publish_pr", false);
  assert.strictEqual(result.decision, "requires_approval");
  assert.strictEqual(result.class, "external_write");
  assert.strictEqual(result.requiresGrant, true);
});

test("policy-classes: external_write allowed with explicit grant", () => {
  const result = checkPolicyClass(["approval:decide"], "publish_pr", true);
  assert.strictEqual(result.decision, "allow");
  assert.strictEqual(result.class, "external_write");
});

test("policy-classes: auto-classifier never allows", () => {
  const result = checkPolicyClass(
    ["approval:decide", "execution:run"],
    "auto-classifier",
    false,
  );
  assert.strictEqual(result.decision, "requires_approval");
  assert.strictEqual(result.reasonCode, "auto_classifier_is_signal_only");
});

test("policy-classes: grant cannot override destructive without approval", () => {
  const result = checkPolicyClass([], "delete:conversation", true);
  assert.strictEqual(result.decision, "requires_approval");
  assert.strictEqual(result.class, "destructive");
});

test("policy-classes: destructive always requires approval and grant", () => {
  const result = checkPolicyClass(
    ["approval:decide"],
    "delete:conversation",
    false,
  );
  assert.strictEqual(result.decision, "requires_approval");
  assert.strictEqual(result.requiresApproval, true);
  assert.strictEqual(result.requiresGrant, true);
});

test("policy-classes: all policy classes defined", () => {
  const classes = Object.keys(POLICY_CLASSES) as Array<
    keyof typeof POLICY_CLASSES
  >;
  assert.strictEqual(classes.length, 6);
  const expectedClasses: Array<keyof typeof POLICY_CLASSES> = [
    "read",
    "local_reversible",
    "external_write",
    "destructive",
    "financial",
    "deployment",
  ];
  for (const expected of expectedClasses) {
    assert.ok(classes.includes(expected), `Missing class: ${expected}`);
  }
});

test("policy-classes: each class has risk level and scope", () => {
  for (const [, def] of Object.entries(POLICY_CLASSES)) {
    assert.ok(
      ["low", "medium", "high", "critical"].includes(def.riskLevel),
      `${def.class} has invalid riskLevel: ${def.riskLevel}`,
    );
    assert.ok(def.sideEffectScope, `${def.class} missing sideEffectScope`);
    assert.ok(typeof def.label === "string", `${def.class} missing label`);
  }
});
