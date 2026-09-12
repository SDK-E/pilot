import assert from "node:assert/strict";
import test from "node:test";
import {
  createBudgetReservation,
  spendFromReservation,
  reconcileBudget,
} from "@/executions/execution-attempts";

test("AC-09-02: first spend succeeds within limits", () => {
  const reservation = createBudgetReservation({
    executionId: "exec_1",
    parentBudgetId: "budget_1",
    tokenLimit: 1000,
    costLimit: 100,
    stepLimit: 10,
    toolCallLimit: 5,
    sandboxSecondsLimit: 60,
    delegationDepthLimit: 3,
  });

  const result = spendFromReservation(reservation, {
    tokens: 200,
    cost: 15,
    steps: 2,
    toolCalls: 1,
    sandboxSeconds: 10,
  });

  assert.equal(result.allowed, true);
  assert.equal(result.remaining.tokens, 800);
  assert.equal(result.remaining.cost, 85);
  assert.equal(result.remaining.steps, 8);
  assert.equal(result.remaining.toolCalls, 4);
  assert.equal(result.remaining.sandboxSeconds, 50);
});

test("AC-09-02: second spend from same reservation respects first", () => {
  const reservation = createBudgetReservation({
    executionId: "exec_1",
    parentBudgetId: "budget_1",
    tokenLimit: 1000,
    costLimit: 100,
    stepLimit: 10,
    toolCallLimit: 5,
    sandboxSecondsLimit: 60,
    delegationDepthLimit: 3,
  });

  spendFromReservation(reservation, {
    tokens: 200,
    cost: 15,
    steps: 2,
    toolCalls: 1,
    sandboxSeconds: 10,
  });

  const result = spendFromReservation(reservation, {
    tokens: 900,
    cost: 10,
    steps: 1,
    toolCalls: 1,
    sandboxSeconds: 10,
  });

  assert.equal(result.allowed, false);
  assert.ok(result.exceeded, "should report exceeded field");
  if (result.exceeded) {
    assert.equal(result.exceeded.field, "tokens");
    assert.equal(result.exceeded.requested, 900);
    assert.equal(result.exceeded.remaining, 800);
  }
});

test("AC-09-02: exact remaining budget allowed", () => {
  const reservation = createBudgetReservation({
    executionId: "exec_1",
    parentBudgetId: "budget_1",
    tokenLimit: 100,
    costLimit: 50,
    stepLimit: 10,
    toolCallLimit: 5,
    sandboxSecondsLimit: 60,
    delegationDepthLimit: 3,
  });

  const first = spendFromReservation(reservation, {
    tokens: 60,
    cost: 20,
    steps: 3,
    toolCalls: 2,
    sandboxSeconds: 25,
  });
  assert.equal(first.allowed, true);

  const second = spendFromReservation(reservation, {
    tokens: 40,
    cost: 30,
    steps: 7,
    toolCalls: 3,
    sandboxSeconds: 35,
  });
  assert.equal(second.allowed, true);
});

test("AC-09-02: zero spend always allowed", () => {
  const reservation = createBudgetReservation({
    executionId: "exec_1",
    parentBudgetId: "budget_1",
    tokenLimit: 100,
    costLimit: 50,
    stepLimit: 10,
    toolCallLimit: 5,
    sandboxSecondsLimit: 60,
    delegationDepthLimit: 3,
  });

  const result = spendFromReservation(reservation, {});
  assert.equal(result.allowed, true);
});

test("AC-09-02: budget with no parent is standalone", () => {
  const reservation = createBudgetReservation({
    executionId: "exec_1",
    tokenLimit: 100,
    costLimit: 50,
    stepLimit: 10,
    toolCallLimit: 5,
    sandboxSecondsLimit: 60,
    delegationDepthLimit: 3,
  });

  assert.equal(reservation.parentBudgetId, null);
});

test("AC-09-02: reconciliation reports unknown when estimated zero", () => {
  const reservation = createBudgetReservation({
    executionId: "exec_1",
    tokenLimit: 100,
    costLimit: 50,
    stepLimit: 10,
    toolCallLimit: 5,
    sandboxSecondsLimit: 60,
    delegationDepthLimit: 3,
  });

  const result = reconcileBudget(
    reservation,
    {
      tokens: 0,
      cost: 0,
      steps: 0,
      toolCalls: 0,
      sandboxSeconds: 0,
    },
    {
      tokens: 10,
      cost: 5,
      steps: 1,
      toolCalls: 1,
      sandboxSeconds: 2,
    },
  );

  assert.equal(result.hasUnknown, true);
  assert.equal(result.adjusted.tokens, 10);
  assert.equal(result.adjusted.cost, 5);
});
