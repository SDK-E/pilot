export interface CommandFormState {
  message?: string;
  status: "idle" | "error" | "success";
  /*
   * Where to go after a successful save.
   */
  href?: string;
}
