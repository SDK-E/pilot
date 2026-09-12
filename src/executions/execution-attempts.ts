export interface ExecutionAttempt {
  id: string;
  executionId: string;
  attemptNumber: number;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  result?: {
    outcome: string;
    message?: string;
    usage?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
  };
}

export interface BudgetReservation {
  id: string;
  executionId: string;
  parentBudgetId: string | null;
  tokenLimit: number;
  costLimit: number;
  stepLimit: number;
  toolCallLimit: number;
  sandboxSecondsLimit: number;
  delegationDepthLimit: number;
  spent: BudgetSpent;
}

export interface BudgetSpent {
  tokens: number;
  cost: number;
  steps: number;
  toolCalls: number;
  sandboxSeconds: number;
}

export interface BudgetSpendRequest {
  tokens?: number;
  cost?: number;
  steps?: number;
  toolCalls?: number;
  sandboxSeconds?: number;
}

export interface BudgetSpendResult {
  allowed: boolean;
  remaining: BudgetSpent;
  exceeded?: { field: string; requested: number; remaining: number };
}

export interface BudgetReservationWithParent extends BudgetReservation {
  parent?: BudgetReservation;
}

export function createBudgetReservation(input: {
  executionId: string;
  parentBudgetId?: string;
  tokenLimit: number;
  costLimit: number;
  stepLimit: number;
  toolCallLimit: number;
  sandboxSecondsLimit: number;
  delegationDepthLimit: number;
}): BudgetReservation {
  return {
    id: `budget_${input.executionId}`,
    executionId: input.executionId,
    parentBudgetId: input.parentBudgetId ?? null,
    tokenLimit: input.tokenLimit,
    costLimit: input.costLimit,
    stepLimit: input.stepLimit,
    toolCallLimit: input.toolCallLimit,
    sandboxSecondsLimit: input.sandboxSecondsLimit,
    delegationDepthLimit: input.delegationDepthLimit,
    spent: { tokens: 0, cost: 0, steps: 0, toolCalls: 0, sandboxSeconds: 0 },
  };
}

export function spendFromReservation(
  reservation: BudgetReservation,
  request: BudgetSpendRequest,
): BudgetSpendResult {
  const remaining: BudgetSpent = {
    tokens: reservation.tokenLimit - reservation.spent.tokens,
    cost: reservation.costLimit - reservation.spent.cost,
    steps: reservation.stepLimit - reservation.spent.steps,
    toolCalls: reservation.toolCallLimit - reservation.spent.toolCalls,
    sandboxSeconds:
      reservation.sandboxSecondsLimit - reservation.spent.sandboxSeconds,
  };

  const fields: (keyof BudgetSpendRequest & keyof BudgetSpent)[] = [
    "tokens",
    "cost",
    "steps",
    "toolCalls",
    "sandboxSeconds",
  ];

  for (const field of fields) {
    const requested = request[field] ?? 0;
    if (requested > remaining[field]) {
      return {
        allowed: false,
        remaining,
        exceeded: {
          field,
          requested,
          remaining: remaining[field],
        },
      };
    }
  }

  for (const field of fields) {
    const amount = request[field] ?? 0;
    reservation.spent[field] += amount;
  }

  return {
    allowed: true,
    remaining: {
      tokens: reservation.tokenLimit - reservation.spent.tokens,
      cost: reservation.costLimit - reservation.spent.cost,
      steps: reservation.stepLimit - reservation.spent.steps,
      toolCalls: reservation.toolCallLimit - reservation.spent.toolCalls,
      sandboxSeconds:
        reservation.sandboxSecondsLimit - reservation.spent.sandboxSeconds,
    },
  };
}

export function reconcileBudget(
  reservation: BudgetReservation,
  estimated: BudgetSpent,
  actual: BudgetSpent,
): { adjusted: BudgetSpent; hasUnknown: boolean } {
  const hasUnknown =
    estimated.tokens === 0 ||
    estimated.cost === 0 ||
    estimated.steps === 0 ||
    estimated.toolCalls === 0 ||
    estimated.sandboxSeconds === 0;

  return {
    adjusted: {
      tokens: actual.tokens,
      cost: actual.cost,
      steps: actual.steps,
      toolCalls: actual.toolCalls,
      sandboxSeconds: actual.sandboxSeconds,
    },
    hasUnknown,
  };
}
