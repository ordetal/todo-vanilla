import { CUSTOM_EVENTS, GLOBAL_SELECTORS } from "../constants/constants.js";
import { rootElements } from "./elements.js";
import { taskStorage } from "./storage.js";

const stateClasses = {
  isClone: "is-clone",
};

const classTimers = new WeakMap();

function autoDismissClass(element, stateClass, ms = 2000) {
  const timerKey = element;

  if (classTimers.has(timerKey)) clearTimeout(classTimers.get(timerKey));

  element.classList.add(stateClass);

  const timerId = setTimeout(() => {
    element.classList.remove(stateClass);
    classTimers.delete(timerKey);
  }, ms);

  classTimers.set(timerKey, timerId);

  return () => {
    clearTimeout(timerId);
    classTimers.delete(timerKey);
  };
}

function showToast({ text, isInfo = true, ms = 2000, handleRemove = undefined }) {
  document.dispatchEvent(
    new CustomEvent(CUSTOM_EVENTS.TOAST_ADD, {
      detail: {
        text,
        isInfo,
        ms,
        handleRemove,
      },
    }),
  );
}

function scrollRootByY(px) {
  rootElements.rootHTML.scrollTop += px;
}

function hideScrollBar() {
  rootElements.rootBody.style.overflow = "hidden";
}

function getTaskIndex(taskElement) {
  const taskElementDataId = taskElement.dataset.jsTaskItemId;

  return taskStorage.taskListFromStorage.findIndex(({ id }) => id === taskElementDataId);
}

function getTaskElementFromPoint(x, y) {
  return document.elementFromPoint(x, y)?.closest(GLOBAL_SELECTORS.TASK_ITEM);
}

function createTaskClone(taskElement) {
  const cloneElement = taskElement.cloneNode(true);
  cloneElement.classList.add(stateClasses.isClone);

  return cloneElement;
}

export {
  autoDismissClass,
  hideScrollBar,
  scrollRootByY,
  getTaskIndex,
  getTaskElementFromPoint,
  createTaskClone,
  showToast,
};
