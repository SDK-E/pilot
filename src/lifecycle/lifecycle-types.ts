export type LifecyclePhase =
  "pending" | "in_progress" | "completed" | "failed" | "cancelled";

export type LifecycleStatus = LifecyclePhase;

export interface LifecycleOperation {
  id: string;
  organizationId: string;
  actorId: string;
  resourceType: string;
  resourceId: string;
  phase: LifecyclePhase;
  attempts: number;
  nextAttemptAt: Date | null;
  status: LifecycleStatus;
  errorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOperationInput {
  organizationId: string;
  actorId: string;
  resourceType: string;
  resourceId: string;
  phase?: LifecyclePhase;
}

export interface UpdateOperationStatusInput {
  operationId: string;
  organizationId: string;
  status: LifecycleStatus;
  errorCode?: string | null;
  attempts?: number;
  nextAttemptAt?: Date | null;
}

export interface ListOperationsInput {
  organizationId: string;
  phase?: LifecyclePhase;
  status?: LifecycleStatus;
}
