export const commonMessages = {
  greeting: "Hello",
  greeting_1: "Hello, {name}",
  greeting_many: "Hello, {name} and {count} others",
  error: "An error occurred",
  error_1: "Error: {message}",
  loading: "Loading",
  empty: "No items found",
  save: "Save",
  cancel: "Cancel",
  delete: "Delete",
  edit: "Edit",
  done: "Done",
  skip: "Skip",
  next: "Next",
  back: "Back",
  close: "Close",
  confirm: "Confirm",
  success: "Success",
  warning: "Warning",
} as const;

export const authMessages = {
  login: "Sign in",
  logout: "Sign out",
  unauthorized: "You are not authorized to perform this action",
  forbidden: "Access denied",
  sessionExpired: "Your session has expired. Please sign in again.",
} as const;

export const uiMessages = {
  search: "Search",
  filter: "Filter",
  sort: "Sort",
  reset: "Reset",
  all: "All",
  none: "None",
  yes: "Yes",
  no: "No",
  ok: "OK",
  apply: "Apply",
  clear: "Clear",
} as const;
