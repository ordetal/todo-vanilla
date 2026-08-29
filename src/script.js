"use strict";

const selectors = {
  rootTodo: "[data-js-todo]",
  themeSwitcherBtn: "[data-js-theme-switcher-btn]",
  themeSwitcherSvgSun: "[data-js-theme-switcher-svg-sun]",
  themeSwitcherSvgMoon: "[data-js-theme-switcher-svg-moon]",
  taskForm: "[data-js-task-form]",
  taskFormInput: "[data-js-task-form-input]",
  taskFormBtnAdd: "[data-js-task-form-btn-add]",
  taskFormBtnDeleteAll: "[data-js-task-form-btn-delete-all]",
  tasksTitle: "[data-js-tasks-title]",
  tasksCount: "[data-js-tasks-count]",
  tasksList: "[data-js-tasks-list]",
  tasksEmpty: "[data-js-tasks-empty]",
  taskItem: "[data-js-task-item]",
  taskComplete: "[data-js-tasks-complete]",
  taskText: "[data-js-task-text]",
  taskDraggable: "[data-js-task-draggable]",
  taskBtnDelete: "[data-js-task-btn-delete]",
  toastContainer: "[data-js-toast-container]",
};

const stateClasses = {
  isDarkTheme: "is-dark-theme",
  isHidden: "is-hidden",
  isWarning: "is-warning",
  isInfo: "is-info",
  isCompleted: "is-completed",
  isDisabled: "is-disabled",
  isAnimated: "is-animated",
  isDragging: "is-dragging",
  isHovered: "is-hovered",
  isClone: "is-clone",
};

const baseClasses = {
  toast: "toast-container__toast",
}

const localStorageKeys = {
  theme: "theme", taskList: "taskList",
};

const themes = {
  light: "light", dark: "dark",
};

const customEvents = {
  toastRemove: "toast-remove",
};

const todoConstants = {
  MAX_COUNT_TASKS: 100,
};

const todoState = {
  get isDarkTheme() {
    return rootHTML.classList.contains(stateClasses.isDarkTheme);
  },
  get themeSwitcherSvgElement() {
    const theme = getItemFromLocalStorage(localStorageKeys.theme);

    return theme === themes.light ? themeSwitcherSvgSunElement : themeSwitcherSvgMoonElement;
  },
  get isTaskListEmpty() {
    return this.taskListFromLocalStorage.length <= 0;
  },
  get isTaskListFull() {
    return this.taskListFromLocalStorage.length >= todoConstants.MAX_COUNT_TASKS;
  },
  get taskListFromLocalStorage() {
    return JSON.parse(getItemFromLocalStorage(localStorageKeys.taskList)) ?? [];
  },
};

const classTimers = new Map();
const toastTimers = new Map();

const rootHTML = document.documentElement;
const rootBody = document.body;
const rootTodoElement = document.querySelector(selectors.rootTodo);

const themeSwitcherSvgBtnElement = rootTodoElement.querySelector(selectors.themeSwitcherBtn);
const themeSwitcherSvgSunElement = rootTodoElement.querySelector(selectors.themeSwitcherSvgSun);
const themeSwitcherSvgMoonElement = rootTodoElement.querySelector(selectors.themeSwitcherSvgMoon);

const taskFormInputElement = rootTodoElement.querySelector(selectors.taskFormInput);
const taskFormBtnAddElement = rootTodoElement.querySelector(selectors.taskFormBtnAdd);
const taskFormBtnDeleteAllElement = rootTodoElement.querySelector(selectors.taskFormBtnDeleteAll);

const tasksTitleElement = rootTodoElement.querySelector(selectors.tasksTitle);
const tasksCountElement = rootTodoElement.querySelector(selectors.tasksCount);
const tasksListElement = rootTodoElement.querySelector(selectors.tasksList);
const tasksEmptyElement = rootTodoElement.querySelector(selectors.tasksEmpty);

const toastContainerElement = rootBody.querySelector(selectors.toastContainer);

const toastListStartElement = getToastElement("List Start");
const toastListEndElement = getToastElement("List End");
const toastListFullElement = getToastElement("The List Is Full", false);
const toastListEmptyElement = getToastElement("The Text Is Empty", false);

function bindEvents() {
  themeSwitcherSvgBtnElement.addEventListener("click", handlerThemeSwitcher);

  taskFormBtnAddElement.addEventListener("click", handlerAddTask);
  taskFormBtnAddElement.addEventListener("pointerdown", handlerPreventDefault);
  taskFormInputElement.addEventListener("input", handlerClearWarning);
  taskFormBtnDeleteAllElement.addEventListener("click", handlerClearTasks);

  tasksListElement.addEventListener("click", handlerActionOnTask);
  tasksListElement.addEventListener("dragstart", handlerPreventDefault);
  tasksListElement.addEventListener("pointerdown", handlerDragStart);

  toastListEmptyElement.addEventListener(customEvents.toastRemove,
    handlerClearElementClass.bind(null, taskFormInputElement, stateClasses.isWarning));

  toastListFullElement.addEventListener(customEvents.toastRemove,
    handlerClearElementClass.bind(null, tasksTitleElement, stateClasses.isWarning));

  window.visualViewport.addEventListener("resize", updateToastPosition);
}

function handlerDragStart(event) {
  event.preventDefault();

  if (!event.isPrimary) return;

  const {target} = event;

  if (!target.matches(selectors.taskDraggable)) return;

  const {isAnimated, isDragging, isHovered, isClone} = stateClasses;

  const {pointerId, y} = event;

  const taskElement = target.closest(selectors.taskItem)
  const shiftY = y - taskElement.getBoundingClientRect().top;

  taskElement.classList.remove(isAnimated);

  const cloneElement = createClone();
  taskElement.before(cloneElement);

  taskElement.setPointerCapture(pointerId);
  taskElement.classList.add(isDragging);
  taskElement.style.position = "fixed";
  setTaskTop(y - shiftY);

  hideScrollBar();

  const taskList = todoState.taskListFromLocalStorage;
  const firstTaskId = taskList.at(0).id;
  const lastTaskId = taskList.at(-1).id;

  const taskHeight = taskElement.offsetHeight;
  const SWAP_THRESHOLD = taskHeight / 2;
  const AUTO_SCROLL_THRESHOLD = 25;
  const SCROLL_OFFSET = taskHeight * 2;
  const TOLERANCE = 2;

  const viewportTop = 0;
  const viewportBottom = window.innerHeight - taskHeight;

  const viewportTopForScroll = AUTO_SCROLL_THRESHOLD;
  const viewportBottomForScroll = viewportBottom - AUTO_SCROLL_THRESHOLD;

  let top;
  let tasksListCoords;
  let tasksListTop;
  let tasksListBottom;

  let hoveredTaskElement;
  let prevHoveredTaskElement;

  function handlerPointerMove(event) {
    if (event.buttons !== 1) {
      handlerDragCancel();
      return;
    }

    top = event.y - shiftY;

    tasksListCoords = tasksListElement.getBoundingClientRect();
    tasksListTop = tasksListCoords.top;
    tasksListBottom = tasksListCoords.bottom - taskHeight;

    const taskElementCoords = taskElement.getBoundingClientRect();

    hoveredTaskElement = getTaskElementFromPoint(
      taskElementCoords.left + SWAP_THRESHOLD, taskElementCoords.top + SWAP_THRESHOLD);

    animateHoveredTask();
    autoScroll();

    if (hoveredTaskElement !== prevHoveredTaskElement) {
      animateHoveredTask();
    }

    if (top <= viewportTop) {
      top = viewportTop;
    } else if (top >= viewportBottom) {
      top = viewportBottom;
    }

    if (top < tasksListTop) {
      top = tasksListTop;
    } else if (top > tasksListBottom) {
      top = tasksListBottom;
    }

    setTaskTop(top);
  }

  function handlerDragEnd() {
    hoveredTaskElement?.classList.remove(isHovered);

    const targetTaskTop = taskElement.getBoundingClientRect().top;
    const hoveredTaskTop = hoveredTaskElement?.getBoundingClientRect().top;

    if (!hoveredTaskElement || hoveredTaskElement === cloneElement) {
      handlerDragCancel();
      return;
    }

    let indexOffset = 0;

    if (targetTaskTop > hoveredTaskTop) {
      hoveredTaskElement.after(taskElement);
      indexOffset++;

      if (top >= viewportBottomForScroll) {
        scrollRootByY(SCROLL_OFFSET);
      }
    } else if (targetTaskTop <= hoveredTaskTop) {
      hoveredTaskElement.before(taskElement);

      if (top <= viewportTopForScroll) {
        scrollRootByY(-SCROLL_OFFSET);
      }
    }

    autoDismissClass(taskElement, isAnimated);

    let fromIndex = getTaskIndex(taskElement);
    const toIndex = getTaskIndex(hoveredTaskElement) + indexOffset;

    const [taskElemFromTaskList] = taskList.slice(fromIndex, fromIndex + 1);

    const taskListNew = [...taskList.slice(0, toIndex), taskElemFromTaskList, ...taskList.slice(toIndex)];

    if (fromIndex > toIndex) fromIndex++;
    taskListNew.splice(fromIndex, 1);

    saveItemToLocalStorage(localStorageKeys.taskList, JSON.stringify(taskListNew));
    handlerDragCancel();
  }

  function handlerDragCancel() {
    taskElement.removeEventListener("pointerup", handlerDragEnd);
    taskElement.removeEventListener("pointermove", handlerPointerMove);
    taskElement.removeEventListener("pointercancel", handlerDragCancel);
    window.removeEventListener("blur", handlerDragCancel);
    window.removeEventListener("resize", handlerDragCancel);

    taskElement.releasePointerCapture(pointerId);
    taskElement.classList.remove(isDragging);

    hoveredTaskElement?.classList.remove(isHovered);
    prevHoveredTaskElement?.classList.remove(isHovered);

    taskElement.removeAttribute("style");
    rootBody.removeAttribute("style");
    cloneElement.remove();
  }

  function autoScroll() {
    if (!hoveredTaskElement) return;

    const isMaxScroll = tasksListCoords.top >= -TOLERANCE;
    const isMinScroll = tasksListCoords.bottom <= rootHTML.clientHeight + TOLERANCE;

    if (top <= viewportTopForScroll && !isMaxScroll) {
      let prevTaskElement = hoveredTaskElement.previousElementSibling ?? hoveredTaskElement;

      if (prevTaskElement === taskElement) {
        prevTaskElement = cloneElement;
      }

      const isFirstElem = firstTaskId === prevTaskElement.dataset.jsTaskItemId;
      let scrollTopUp = prevTaskElement.getBoundingClientRect().top;

      if (isFirstElem) {
        scrollTopUp = tasksListCoords.top;
        showToast(toastListStartElement);
      }

      scrollRootByY(scrollTopUp);
      hoveredTaskElement = prevTaskElement;
    } else if (top >= viewportBottomForScroll && !isMinScroll) {
      let nextTaskElement = hoveredTaskElement.nextElementSibling ?? hoveredTaskElement;

      if (nextTaskElement === taskElement) {
        nextTaskElement = nextTaskElement.nextElementSibling ?? hoveredTaskElement;
      }

      const isLastElem = lastTaskId === nextTaskElement.dataset.jsTaskItemId;
      let scrollTopDown = nextTaskElement?.getBoundingClientRect().bottom - rootHTML.clientHeight;

      if (isLastElem) {
        scrollTopDown = tasksListCoords.bottom - rootHTML.clientHeight;
        showToast(toastListEndElement);
      }

      if (scrollTopDown > 0) {
        scrollRootByY(scrollTopDown);
      }

      hoveredTaskElement = nextTaskElement;
    }
  }

  function animateHoveredTask() {
    if (!hoveredTaskElement) return;

    if (hoveredTaskElement === prevHoveredTaskElement) return;

    if (prevHoveredTaskElement && hoveredTaskElement !== prevHoveredTaskElement) {
      prevHoveredTaskElement.classList.remove(isHovered);
    }

    hoveredTaskElement.classList.add(isHovered);
    prevHoveredTaskElement = hoveredTaskElement;
  }

  function createClone() {
    const cloneElement = taskElement.cloneNode(true);
    cloneElement.classList.add(isClone);

    return cloneElement;
  }

  function setTaskTop(top) {
    taskElement.style.top = `${top}px`;
  }

  taskElement.addEventListener("pointerup", handlerDragEnd);
  taskElement.addEventListener("pointermove", handlerPointerMove);
  taskElement.addEventListener("pointercancel", handlerDragCancel);
  window.addEventListener("blur", handlerDragCancel);
  window.addEventListener("resize", handlerDragCancel);
}

function handlerThemeSwitcher() {
  const activeSvgElement = todoState.themeSwitcherSvgElement;
  const {isAnimated} = stateClasses;

  if (activeSvgElement.classList.contains(isAnimated)) return;

  const {light, dark} = themes;

  activeSvgElement.classList.add(isAnimated);

  activeSvgElement.addEventListener("animationend", () => {
    activeSvgElement.classList.remove(isAnimated);
    rootHTML.classList.toggle(stateClasses.isDarkTheme);

    toggleThemeSwitcherSvg();
    toggleThemeButtonAriaLabel();

    saveItemToLocalStorage(
      localStorageKeys.theme,
      todoState.isDarkTheme ? dark : light
    );
  }, {once: true});
}

function handlerClearWarning() {
  this.classList.remove(stateClasses.isWarning);
  classTimers.delete(this);
}

function handlerAddTask(event) {
  event.preventDefault();

  if (todoState.isTaskListFull) {
    showToast(toastListFullElement);
    autoDismissClass(tasksTitleElement, stateClasses.isWarning);
    return;
  }

  const text = taskFormInputElement.value.trim();

  if (!text) {
    showToast(toastListEmptyElement);
    autoDismissClass(taskFormInputElement, stateClasses.isWarning);
    return;
  }

  const id = crypto.randomUUID();
  const taskTemplate = getTaskTemplate(id);

  tasksListElement.insertAdjacentHTML("beforeend", taskTemplate);

  const taskTextElement = tasksListElement.lastElementChild.querySelector(selectors.taskText);
  taskTextElement.textContent = text;

  taskFormInputElement.value = "";

  const taskListArr = todoState.taskListFromLocalStorage;
  taskListArr.push({
    id, text, isCompleted: false,
  });

  saveItemToLocalStorage(localStorageKeys.taskList, JSON.stringify(taskListArr));
  updateTodoList();
}

function handlerClearTasks() {
  tasksListElement.innerHTML = "";

  removeItemFromLocalStorage(localStorageKeys.taskList);
  updateTodoList();
}

function handlerActionOnTask(event) {
  const taskElement = event.target.closest(selectors.taskItem);
  const taskCompleteElement = event.target.closest(selectors.taskComplete);
  const taskBtnDeleteElement = event.target.closest(selectors.taskBtnDelete);

  if (taskCompleteElement) {
    taskElement.classList.toggle(stateClasses.isCompleted);
    toggleTaskCompletedToLocalStorage(taskElement.dataset.jsTaskItemId);
  } else if (taskBtnDeleteElement) {
    taskElement.remove();

    const taskList = JSON.parse(localStorage.getItem(localStorageKeys.taskList));

    saveItemToLocalStorage(
      localStorageKeys.taskList,
      JSON.stringify(taskList
        .filter(item => item.id !== taskElement.dataset.jsTaskItemId))
    );
    updateTodoList();
  }
}

function handlerPreventDefault(event) {
  event.preventDefault();
}

function handlerClearElementClass(element, stateClass) {
  element.classList.remove(stateClass);
  classTimers.delete(element);
}

function setInitialTheme() {
  const {light, dark} = themes;
  const themeKey = localStorageKeys.theme;

  const theme = getItemFromLocalStorage(themeKey);

  if (theme === dark) {
    rootHTML.classList.add(stateClasses.isDarkTheme);
    toggleThemeSwitcherSvg();
    return;
  }

  if (!theme) {
    saveItemToLocalStorage(themeKey, light);
  }
}

function setInitialTaskList() {
  const taskListArr = todoState.taskListFromLocalStorage;

  taskListArr.forEach(task => {
    const {id, text, isCompleted} = task;

    const taskTemplate = getTaskTemplate(id, isCompleted);
    tasksListElement.insertAdjacentHTML("beforeend", taskTemplate);

    const taskTextElement = tasksListElement.lastElementChild.querySelector(selectors.taskText);
    taskTextElement.textContent = text;
  });
}

function toggleTaskCompletedToLocalStorage(id) {
  const taskListArr = todoState.taskListFromLocalStorage;

  taskListArr.map(task => {
    if (task.id === id) {
      task.isCompleted = !task.isCompleted;
    }
  });

  saveItemToLocalStorage(localStorageKeys.taskList, JSON.stringify(taskListArr));
}

function toggleThemeSwitcherSvg() {
  themeSwitcherSvgSunElement.classList.toggle(stateClasses.isHidden);
  themeSwitcherSvgMoonElement.classList.toggle(stateClasses.isHidden);
}

function toggleThemeButtonAriaLabel() {
  const ariaLabel = todoState.isDarkTheme ?
    "Switch to light theme" : "Switch to dark theme";

  themeSwitcherSvgBtnElement.setAttribute("aria-label", ariaLabel);
}

function toggleTaskListEmpty() {
  tasksEmptyElement.classList.toggle(stateClasses.isHidden, !todoState.isTaskListEmpty);
}

function disabledBtnDeleteAll() {
  const {isTaskListEmpty} = todoState;

  taskFormBtnDeleteAllElement.disabled = isTaskListEmpty;

  if (isTaskListEmpty) {
    taskFormBtnDeleteAllElement.classList.add(stateClasses.isDisabled);
  } else {
    taskFormBtnDeleteAllElement.classList.remove(stateClasses.isDisabled);
  }
}

function changeTaskCount() {
  tasksCountElement.textContent = todoState.taskListFromLocalStorage.length;
}

function updateTodoList() {
  changeTaskCount();
  toggleTaskListEmpty();
  disabledBtnDeleteAll();
}

function getTaskTemplate(id, isCompleted = false) {
  return `
      <li class="tasks__item ${isCompleted ? stateClasses.isCompleted : ""}" data-js-task-item data-js-task-item-id="${id}">
        <label class="tasks__complete">
          <input type="checkbox" name="taskComplete" class="tasks__checkbox" ${isCompleted ? "checked" : ""}  data-js-tasks-complete>  
          <span class="tasks__checkmark">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24" 
                 class="tasks__checkmark-svg" aria-hidden="true">
              <path 
                d="M9 15.59 4.71 11.3 3.3 12.71l5 5c.2.2.45.29.71.29s.51-.1.71-.29l11-11-1.41-1.41L9.02 15.59Z"></path>
            </svg>
          </span>
          
          <span class="tasks__text" data-js-task-text></span>
        </label>
        
        <div class="tasks__actions">
          <button type="button" class="tasks__delete" data-js-task-btn-delete aria-label="Delete task">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"
                  class="tasks__cross" aria-hidden="true">
              <path
                d="m7.76 14.83-2.83 2.83 1.41 1.41 2.83-2.83 2.12-2.12.71-.71.71.71 1.41 1.42 3.54 3.53 1.41-1.41-3.53-3.54-1.42-1.41-.71-.71 5.66-5.66-1.41-1.41L12 10.59 6.34 4.93 4.93 6.34 10.59 12l-.71.71z"></path>
            </svg>
          </button>
          
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24" fill="currentColor"
           class="tasks__draggable" data-js-task-draggable aria-hidden="true">
            <circle cx="92" cy="60" r="20"/>
            <circle cx="164" cy="60" r="16"/>
            <circle cx="92" cy="128" r="16"/>
            <circle cx="164" cy="128" r="20"/>
            <circle cx="92" cy="196" r="20"/>
            <circle cx="164" cy="196" r="16"/>
          </svg>
        </div>
      </li>
      `;
}

function getToastElement(text, isInfo = true) {
  const toast = document.createElement("div");
  const typeClass = isInfo ? stateClasses.isInfo : stateClasses.isWarning;

  toast.classList.add(baseClasses.toast, typeClass);
  toast.textContent = text;

  toast.setAttribute("role", isInfo ? "status" : "alert");
  toast.setAttribute("aria-live", isInfo ? "polite" : "assertive");

  return toast;
}

function showToast(toastElement, ms = 2000) {
  if (toastTimers.has(toastElement)) clearTimeout(toastTimers.get(toastElement));

  toastElement.classList.remove(stateClasses.isAnimated);

  if (!toastContainerElement.contains(toastElement)) {
    [...toastContainerElement.children].forEach(item => {
      clearTimeout(toastTimers.get(item));
      toastTimers.delete(item);

      item.dispatchEvent(new CustomEvent(customEvents.toastRemove));
    });

    toastContainerElement.innerHTML = "";
    toastContainerElement.append(toastElement);
  }

  updateToastPosition();

  toastTimers.set(toastElement, setTimeout(() => {
    toastElement.classList.add(stateClasses.isAnimated);
    toastTimers.delete(toastElement);
  }, ms));
}

function updateToastPosition() {
  const toastElement = toastContainerElement.firstElementChild;

  if (!toastElement) return;

  const OFFSET = 4;
  const MIN_HEIGHT_KEYBOARD = 150;

  const keyboardHeight = window.innerHeight - window.visualViewport.height;
  const isKeyboardOpen = keyboardHeight >= MIN_HEIGHT_KEYBOARD;

  const toastStyles = toastElement.style;

  if (isKeyboardOpen) {
    toastStyles.bottom = `${keyboardHeight + OFFSET}px`;
  } else {
    toastStyles.bottom = "";
  }
}

function getTaskIndex(taskElement) {
  const taskElementDataId = taskElement.dataset.jsTaskItemId;

  return todoState.taskListFromLocalStorage.findIndex(({id}) => id === taskElementDataId);
}

function getTaskElementFromPoint(x, y) {
  return document.elementFromPoint(x, y)?.closest(selectors.taskItem);
}

function hideScrollBar() {
  rootBody.style.overflow = "hidden";
}

function scrollRootByY(px) {
  rootHTML.scrollTop += px;
}

function autoDismissClass(element, stateClass, ms = 2000) {
  const timerKey = element;

  if (classTimers.has(timerKey)) clearTimeout(classTimers.get(timerKey));

  element.classList.add(stateClass);

  classTimers.set(timerKey, setTimeout(() => {
    element.classList.remove(stateClass);
    classTimers.delete(timerKey);
  }, ms));
}

function saveItemToLocalStorage(key, value) {
  localStorage.setItem(key, value);
}

function getItemFromLocalStorage(key) {
  return localStorage.getItem(key);
}

function removeItemFromLocalStorage(key) {
  localStorage.removeItem(key);
}

bindEvents();
setInitialTheme();
setInitialTaskList();
updateTodoList();