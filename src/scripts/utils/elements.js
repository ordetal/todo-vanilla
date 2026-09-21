const selectors = {
  rootTodo: "[data-js-todo]",
  tasksList: "[data-js-tasks-list]",
};

const rootElements = {
  rootHTML: document.documentElement,
  rootBody: document.body,
  rootTodo: document.querySelector(selectors.rootTodo),
};

const todoElements = {
  tasksList: rootElements.rootTodo.querySelector(selectors.tasksList),
};

export { rootElements, todoElements };
