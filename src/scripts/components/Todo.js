import { TODO_CONSTANTS, GLOBAL_CLASSES, GLOBAL_SELECTORS } from "../constants/constants.js";
import { taskStorage, rootElements, todoElements, autoDismissClass, showToast } from "../utils/index.js";

class Todo {
  selectors = {
    taskForm: "[data-js-task-form]",
    taskFormInput: "[data-js-task-form-input]",
    taskFormBtnAdd: "[data-js-task-form-btn-add]",
    taskFormBtnDeleteAll: "[data-js-task-form-btn-delete-all]",
    tasksTitle: "[data-js-tasks-title]",
    tasksFilter: "[data-js-tasks-filter]",
    tasksCount: "[data-js-tasks-count]",
    tasksMessage: "[data-js-tasks-message]",
    taskTemplate: "[data-js-task-template]",
    taskComplete: "[data-js-tasks-complete]",
    taskText: "[data-js-task-text]",
    taskBtnDelete: "[data-js-task-btn-delete]",
  };

  stateClasses = {
    isCompleted: "is-completed",
    isDisabled: "is-disabled",
  };

  toastText = {
    listFull: "The List Is Full",
    textEmpty: "The Text Is Empty",
  };

  messageText = {
    tasksEmpty: "There are no tasks",
    tasksActive: "There are no active tasks",
    tasksCompleted: "There are no completed tasks",
  };

  filterCategory = {
    all: "all",
    active: "active",
    completed: "completed",
  };

  constructor() {
    const { rootTodo } = rootElements;

    this.taskFormInputElement = rootTodo.querySelector(this.selectors.taskFormInput);
    this.taskFormBtnAddElement = rootTodo.querySelector(this.selectors.taskFormBtnAdd);
    this.taskFormBtnDeleteAllElement = rootTodo.querySelector(this.selectors.taskFormBtnDeleteAll);

    this.tasksTitleElement = rootTodo.querySelector(this.selectors.tasksTitle);
    this.tasksFilter = rootTodo.querySelector(this.selectors.tasksFilter);
    this.tasksCountElement = rootTodo.querySelector(this.selectors.tasksCount);
    this.tasksListElement = todoElements.tasksList;
    this.tasksTemplate = rootTodo.querySelector(this.selectors.taskTemplate);
    this.tasksMessageElement = rootTodo.querySelector(this.selectors.tasksMessage);

    this.bindEvents();
    this.initTaskList();
    this.updateTodoList();
  }

  initTaskList() {
    this.renderTaskList(taskStorage.taskListFromStorage);
  }

  bindEvents() {
    this.taskFormInputElement.addEventListener("input", this.handleClearWarning);
    this.taskFormBtnAddElement.addEventListener("click", this.handleAddTask);
    this.taskFormBtnAddElement.addEventListener("pointerdown", (event) => event.preventDefault());

    this.taskFormBtnDeleteAllElement.addEventListener("click", this.handleClearTasks);

    this.tasksFilter.addEventListener("change", this.handleFilterTasks);
    this.tasksListElement.addEventListener("click", this.handleActionOnTask);
  }

  handleClearWarning = () => {
    this.taskFormInputElement.classList.remove(GLOBAL_CLASSES.IS_WARNING);
    this.taskFormInputStop?.();
  };

  handleAddTask = (event) => {
    event.preventDefault();

    if (this.isTaskListFull) {
      this.tasksTitleStop = autoDismissClass(this.tasksTitleElement, GLOBAL_CLASSES.IS_WARNING);
      showToast({
        text: this.toastText.listFull,
        isInfo: false,
        handleRemove: () => {
          this.tasksTitleElement.classList.remove(GLOBAL_CLASSES.IS_WARNING);
          this.tasksTitleStop?.();
        },
      });
      return;
    }

    const text = this.taskFormInputElement.value.trim();

    if (!text) {
      this.taskFormInputStop = autoDismissClass(this.taskFormInputElement, GLOBAL_CLASSES.IS_WARNING);
      showToast({
        text: this.toastText.textEmpty,
        isInfo: false,
        handleRemove: () => {
          this.taskFormInputElement.classList.remove(GLOBAL_CLASSES.IS_WARNING);
          this.taskFormInputStop?.();
        },
      });
      return;
    }

    const id = crypto.randomUUID();
    this.taskFormInputElement.value = "";

    const taskList = taskStorage.taskListFromStorage;
    taskList.push({
      id,
      text,
      isCompleted: false,
    });

    taskStorage.saveTaskList(taskList);
    this.updateTodoList();
  };

  handleClearTasks = () => {
    taskStorage.removeTaskList();
    this.updateTodoList();
  };

  handleFilterTasks = () => {
    const currentFilter = this.tasksFilter.value;

    let taskList = taskStorage.taskListFromStorage;
    let text = this.messageText.tasksEmpty;

    if (currentFilter === this.filterCategory.active && !this.isTaskListEmpty) {
      text = this.messageText.tasksActive;
      taskList = taskList.filter(({ isCompleted }) => !isCompleted);
    } else if (currentFilter === this.filterCategory.completed && !this.isTaskListEmpty) {
      text = this.messageText.tasksCompleted;
      taskList = taskList.filter(({ isCompleted }) => isCompleted);
    }

    this.tasksMessageElement.textContent = text;
    this.renderTaskList(taskList);
    this.toggleTasksMessageVisibility();
  };

  handleActionOnTask = (event) => {
    const taskElement = event.target.closest(GLOBAL_SELECTORS.TASK_ITEM);
    const taskCompleteElement = event.target.closest(this.selectors.taskComplete);
    const taskBtnDeleteElement = event.target.closest(this.selectors.taskBtnDelete);

    if (taskCompleteElement) {
      taskElement.classList.toggle(this.stateClasses.isCompleted);
      this.toggleTaskCompletedToStorage(taskElement.dataset.jsTaskItemId);

      if (this.tasksFilter.value !== this.filterCategory.all) {
        setTimeout(() => this.updateTodoList(), TODO_CONSTANTS.TRANSITION_MS);
      }
    } else if (taskBtnDeleteElement) {
      taskElement.remove();
      const newTaskList = taskStorage.taskListFromStorage.filter(
        (item) => item.id !== taskElement.dataset.jsTaskItemId,
      );

      taskStorage.saveTaskList(newTaskList);
      this.updateTodoList();
    }
  };

  renderTaskList(taskList) {
    const fragment = new DocumentFragment();

    taskList.forEach((task) => {
      const { id, text, isCompleted } = task;
      fragment.append(this.getTaskTemplate(id, text, isCompleted));
    });

    this.tasksListElement.replaceChildren(fragment);
  }

  toggleTaskCompletedToStorage(id) {
    const taskListStorage = taskStorage.taskListFromStorage;
    const taskFromStorage = taskListStorage.find((task) => task.id === id);

    taskFromStorage.isCompleted = !taskFromStorage.isCompleted;
    taskStorage.saveTaskList(taskListStorage);
  }

  toggleTasksMessageVisibility() {
    const visibleTaskList = this.tasksListElement.querySelectorAll(GLOBAL_SELECTORS.TASK_ITEM);
    this.tasksMessageElement.classList.toggle(GLOBAL_CLASSES.IS_HIDDEN, visibleTaskList.length > 0);
  }

  disabledBtnDeleteAll() {
    this.taskFormBtnDeleteAllElement.disabled = this.isTaskListEmpty;
    this.taskFormBtnDeleteAllElement.classList.toggle(this.stateClasses.isDisabled, this.isTaskListEmpty);
  }

  disabledFilter() {
    this.tasksFilter.disabled = this.isTaskListEmpty;
    if (this.isTaskListEmpty) {
      this.tasksFilter.value = this.filterCategory.all;
    }
  }

  changeTaskCount() {
    this.tasksCountElement.textContent = taskStorage.taskListFromStorage.length;
  }

  updateTodoList() {
    this.changeTaskCount();
    this.disabledBtnDeleteAll();

    this.disabledFilter();
    this.handleFilterTasks();
  }

  getTaskTemplate(id, text, isCompleted = false) {
    const taskElement = this.tasksTemplate.content.cloneNode(true).querySelector(GLOBAL_SELECTORS.TASK_ITEM);

    if (isCompleted) {
      taskElement.classList.add(this.stateClasses.isCompleted);
      taskElement.querySelector(this.selectors.taskComplete).checked = true;
    }

    taskElement.dataset.jsTaskItemId = id;
    taskElement.querySelector(this.selectors.taskText).textContent = text;

    return taskElement;
  }

  get isTaskListFull() {
    return taskStorage.taskListFromStorage.length >= TODO_CONSTANTS.MAX_COUNT_TASKS;
  }

  get isTaskListEmpty() {
    return taskStorage.taskListFromStorage.length <= 0;
  }
}

export default Todo;
