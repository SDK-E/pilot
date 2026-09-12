import assert from "node:assert";
import test from "node:test";
import {
  createActionProposal,
  invalidateProposal,
  consumeProposal,
  isProposalExpired,
  isProposalActive,
} from "@/approvals/action-proposal-types";

test("approval-types: createProposal generates stable hash", () => {
  const a = createActionProposal({
    organizationId: "org_1",
    proposalId: "prop_1",
    type: "publish_pr",
    version: "1",
    targetRef: "repo:sdk-e/pilot",
    canonicalArgsHash: "args_abc",
    permissionSnapshot: { scopes: ["approval:decide"] },
    expiresAt: new Date(Date.now() + 3600_000),
    riskSummary: "low risk summary",
  });

  assert.strictEqual(a.status, "pending");
  assert.strictEqual(a.organizationId, "org_1");
  assert.strictEqual(a.proposalId, "prop_1");
  assert.strictEqual(a.type, "publish_pr");
  assert.ok(a.proposalHash.startsWith("ph_"));
  assert.strictEqual(a.version, "1");
  assert.strictEqual(a.targetRef, "repo:sdk-e/pilot");
});

test("approval-types: same inputs produce same hash", () => {
  const base = {
    organizationId: "org_1",
    proposalId: "prop_1",
    type: "publish_pr" as const,
    version: "1",
    targetRef: "repo:sdk-e/pilot",
    canonicalArgsHash: "args_abc",
    permissionSnapshot: { scopes: ["approval:decide"] },
    expiresAt: new Date(Date.now() + 3600_000),
    riskSummary: "summary",
  };

  const a = createActionProposal(base);
  const b = createActionProposal(base);
  assert.strictEqual(a.proposalHash, b.proposalHash);
});

test("approval-types: different targetRef produces different hash", () => {
  const a = createActionProposal({
    organizationId: "org_1",
    proposalId: "prop_1",
    type: "publish_pr",
    version: "1",
    targetRef: "repo:sdk-e/pilot",
    canonicalArgsHash: "args_abc",
    permissionSnapshot: {},
    expiresAt: new Date(Date.now() + 3600_000),
    riskSummary: "summary",
  });
  const b = createActionProposal({
    organizationId: "org_1",
    proposalId: "prop_2",
    type: "publish_pr",
    version: "1",
    targetRef: "repo:sdk-e/different",
    canonicalArgsHash: "args_abc",
    permissionSnapshot: {},
    expiresAt: new Date(Date.now() + 3600_000),
    riskSummary: "summary",
  });
  assert.notStrictEqual(a.proposalHash, b.proposalHash);
});

test("approval-types: proposal becomes stale after expiration", () => {
  const expired = createActionProposal({
    organizationId: "org_1",
    proposalId: "prop_1",
    type: "publish_pr",
    version: "1",
    targetRef: "repo:x",
    canonicalArgsHash: "h",
    permissionSnapshot: {},
    expiresAt: new Date(Date.now() - 1_000),
    riskSummary: "summary",
  });
  assert.strictEqual(isProposalExpired(expired), true);
  assert.strictEqual(isProposalActive(expired), false);
});

test("approval-types: proposal active when not expired", () => {
  const active = createActionProposal({
    organizationId: "org_1",
    proposalId: "prop_1",
    type: "publish_pr",
    version: "1",
    targetRef: "repo:x",
    canonicalArgsHash: "h",
    permissionSnapshot: {},
    expiresAt: new Date(Date.now() + 3_600_000),
    riskSummary: "summary",
  });
  assert.strictEqual(isProposalExpired(active), false);
  assert.strictEqual(isProposalActive(active), true);
});

test("approval-types: invalidateProposal changes status to stale", () => {
  const active = createActionProposal({
    organizationId: "org_1",
    proposalId: "prop_1",
    type: "publish_pr",
    version: "1",
    targetRef: "repo:x",
    canonicalArgsHash: "h",
    permissionSnapshot: {},
    expiresAt: new Date(Date.now() + 3_600_000),
    riskSummary: "summary",
  });

  const stale = invalidateProposal(active);
  assert.strictEqual(stale.status, "stale");
  assert.strictEqual(stale.id, active.id);
  assert.strictEqual(stale.proposalId, active.proposalId);
  assert.ok(stale.updatedAt >= active.updatedAt);
});

test("approval-types: consumeProposal changes status to consumed", () => {
  const pending = createActionProposal({
    organizationId: "org_1",
    proposalId: "prop_1",
    type: "publish_pr",
    version: "1",
    targetRef: "repo:x",
    canonicalArgsHash: "h",
    permissionSnapshot: {},
    expiresAt: new Date(Date.now() + 3_600_000),
    riskSummary: "summary",
  });

  const consumed = consumeProposal(pending);
  assert.strictEqual(consumed.status, "consumed");
  assert.strictEqual(consumed.id, pending.id);
});

test("approval-types: default status is pending", () => {
  const proposal = createActionProposal({
    organizationId: "org_1",
    proposalId: "prop_1",
    type: "external_write",
    version: "1",
    targetRef: "repo:x",
    canonicalArgsHash: "h",
    permissionSnapshot: {},
    expiresAt: new Date(Date.now() + 3_600_000),
    riskSummary: "summary",
  });
  assert.strictEqual(proposal.status, "pending");
});

test("approval-types: version increments do not invalidate hash of same input", () => {
  const v1 = createActionProposal({
    organizationId: "org_1",
    proposalId: "prop_1",
    type: "publish_pr",
    version: "1",
    targetRef: "repo:x",
    canonicalArgsHash: "h",
    permissionSnapshot: {},
    expiresAt: new Date(Date.now() + 3_600_000),
    riskSummary: "summary",
  });
  const v2 = createActionProposal({
    organizationId: "org_1",
    proposalId: "prop_1",
    type: "publish_pr",
    version: "2",
    targetRef: "repo:x",
    canonicalArgsHash: "h",
    permissionSnapshot: {},
    expiresAt: new Date(Date.now() + 3_600_000),
    riskSummary: "summary",
  });
  assert.notStrictEqual(v1.proposalHash, v2.proposalHash);
});
