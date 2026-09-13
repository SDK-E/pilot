export interface WorkerCreationState {
  message?: string;
  status: "error" | "success" | "idle";
}
