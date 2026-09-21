const TODO_CONSTANTS = {
  MAX_COUNT_TASKS: 100,
  TRANSITION_MS: 300,
};

const LOCAL_STORAGE_KEYS = {
  THEME: "theme",
  TASK_LIST: "taskList",
};

const CUSTOM_EVENTS = {
  TOAST_ADD: "toast-add",
  TOAST_REMOVE: "toast-remove",
};

const GLOBAL_CLASSES = {
  IS_HIDDEN: "is-hidden",
  IS_WARNING: "is-warning",
  IS_ANIMATED: "is-animated",
};

const GLOBAL_SELECTORS = {
  TASK_ITEM: "[data-js-task-item]",
};

export { TODO_CONSTANTS, LOCAL_STORAGE_KEYS, CUSTOM_EVENTS, GLOBAL_CLASSES, GLOBAL_SELECTORS };
