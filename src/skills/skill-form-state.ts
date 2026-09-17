export interface SkillFormState {
  message?: string;
  status: "idle" | "error" | "success";
  /*
   * Where to go after a successful save.
   */
  href?: string;
}
