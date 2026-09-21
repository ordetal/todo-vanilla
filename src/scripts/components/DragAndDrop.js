import { GLOBAL_CLASSES, GLOBAL_SELECTORS } from "../constants/constants.js";
import {
  rootElements,
  todoElements,
  taskStorage,
  autoDismissClass,
  scrollRootByY,
  hideScrollBar,
  createTaskClone,
  getTaskIndex,
  getTaskElementFromPoint,
  showToast,
} from "../utils/index.js";

class DragAndDrop {
  selectors = {
    taskDraggable: "[data-js-task-draggable]",
  };

  stateClasses = {
    isDragging: "is-dragging",
    isHovered: "is-hovered",
    isClone: "is-clone",
  };

  toastText = {
    listStart: "List Start",
    listEnd: "List End",
  };

  initDragState = {
    isDragging: false,
    pointerId: null,
    taskElement: null,
    cloneElement: null,
    shiftY: null,
    top: null,
  };

  initDragConfig = {
    taskHeight: null,
    swapThreshold: null,
    scrollOffset: null,
    autoScrollThreshold: 25,
    tolerance: 2,
  };

  initScrollState = {
    isAnimation: false,
    isMaxScroll: false,
    isMinScroll: false,
    lastCheckTime: 0,
    lastScrollTime: 0,
  };

  initScrollConfig = {
    maxDeltaSeconds: 0.05,
    checkIntervalTime: 50,
    baseSpeed: 200,
    maxSpeed: 600,
    sensCoefficient: null,
  };

  initViewportBounds = {
    viewportTop: 0,
    viewportBottom: null,
    viewportTopForScroll: null,
    viewportBottomForScroll: null,
  };

  initListBounds = {
    tasksListCoords: null,
    tasksListTop: null,
    tasksListBottom: null,
  };

  constructor() {
    this.tasksListElement = todoElements.tasksList;
    this.bindEvents();
  }

  bindEvents() {
    this.tasksListElement.addEventListener("dragstart", (event) => event.preventDefault());
    this.tasksListElement.addEventListener("pointerdown", this.handleDragStart);
  }

  handleDragStart = (event) => {
    event.preventDefault();

    if (!event.isPrimary) return;

    const { target } = event;

    if (!target.matches(this.selectors.taskDraggable)) return;

    const { pointerId, y } = event;

    const taskElement = target.closest(GLOBAL_SELECTORS.TASK_ITEM);
    const shiftY = y - taskElement.getBoundingClientRect().top;

    const top = y - shiftY;
    const taskHeight = taskElement.offsetHeight;

    taskElement.classList.remove(GLOBAL_CLASSES.IS_ANIMATED);

    const cloneElement = createTaskClone(taskElement);
    taskElement.before(cloneElement);

    taskElement.setPointerCapture(pointerId);
    taskElement.classList.add(this.stateClasses.isDragging);
    taskElement.style.position = "fixed";

    this.dragState = {
      isDragging: true,
      pointerId,
      taskElement,
      cloneElement,
      shiftY,
      top,
    };
    this.setTaskTop(top);
    hideScrollBar();

    const { baseSpeed, maxSpeed } = this.initScrollConfig;
    const tasksListCoords = this.tasksListElement.getBoundingClientRect();

    this.dragConfig = {
      ...this.initDragConfig,
      taskHeight,
      swapThreshold: taskHeight / 2,
      scrollOffset: taskHeight * 2,
    };
    this.scrollState = { ...this.initScrollState };
    this.scrollConfig = {
      ...this.initScrollConfig,
      sensCoefficient: (maxSpeed - baseSpeed) / this.initDragConfig.autoScrollThreshold,
    };
    this.viewportBounds = {
      ...this.initViewportBounds,
      viewportBottom: window.innerHeight - taskHeight,
      viewportTopForScroll: this.dragConfig.autoScrollThreshold,
      viewportBottomForScroll: window.innerHeight - taskHeight - this.dragConfig.autoScrollThreshold,
    };
    this.listBounds = {
      tasksListCoords,
      tasksListTop: tasksListCoords.top,
      tasksListBottom: tasksListCoords.bottom - this.dragConfig.taskHeight,
    };

    taskElement.addEventListener("pointerup", this.handleDragEnd);
    taskElement.addEventListener("pointermove", this.handlePointerMove);
    taskElement.addEventListener("pointercancel", this.handleDragCancel);
    window.addEventListener("blur", this.handleDragCancel);
    window.addEventListener("resize", this.handleDragCancel);
  };

  handlePointerMove = (event) => {
    if (event.buttons !== 1) {
      this.handleDragCancel();
      return;
    }

    this.dragState.top = event.y - this.dragState.shiftY;

    if (!this.scrollState.isAnimation) {
      requestAnimationFrame(this.autoScroll);
      this.scrollState.isAnimation = true;
    }
  };

  handleDragEnd = () => {
    this.hoveredTaskElement?.classList.remove(this.stateClasses.isHovered);

    if (!this.hoveredTaskElement || this.hoveredTaskElement === this.dragState.cloneElement) {
      this.handleDragCancel();
      return;
    }

    const { taskElement } = this.dragState;

    const targetTaskTop = taskElement.getBoundingClientRect().top;
    const hoveredTaskTop = this.hoveredTaskElement?.getBoundingClientRect().top;

    let indexOffset = 0;

    if (targetTaskTop > hoveredTaskTop) {
      this.hoveredTaskElement.after(taskElement);
      indexOffset++;

      if (this.dragState.top >= this.viewportBounds.viewportBottomForScroll) {
        scrollRootByY(this.dragConfig.scrollOffset);
      }
    } else if (targetTaskTop <= hoveredTaskTop) {
      this.hoveredTaskElement.before(taskElement);

      if (this.dragState.top <= this.viewportBounds.viewportTopForScroll) {
        scrollRootByY(-this.dragConfig.scrollOffset);
      }
    }

    autoDismissClass(taskElement, GLOBAL_CLASSES.IS_ANIMATED);

    let fromIndex = getTaskIndex(taskElement);
    const toIndex = getTaskIndex(this.hoveredTaskElement) + indexOffset;

    const taskListStorage = taskStorage.taskListFromStorage;
    const [taskFromTaskList] = taskListStorage.slice(fromIndex, fromIndex + 1);

    const taskListStorageNew = [
      ...taskListStorage.slice(0, toIndex),
      taskFromTaskList,
      ...taskListStorage.slice(toIndex),
    ];

    if (fromIndex > toIndex) fromIndex++;
    taskListStorageNew.splice(fromIndex, 1);

    taskStorage.saveTaskList(taskListStorageNew);

    this.handleDragCancel();
  };

  handleDragCancel = () => {
    const { pointerId, taskElement, cloneElement } = this.dragState;

    taskElement.removeEventListener("pointerup", this.handleDragEnd);
    taskElement.removeEventListener("pointermove", this.handlePointerMove);
    taskElement.removeEventListener("pointercancel", this.handleDragCancel);
    window.removeEventListener("blur", this.handleDragCancel);
    window.removeEventListener("resize", this.handleDragCancel);

    taskElement.releasePointerCapture(pointerId);
    taskElement.classList.remove(this.stateClasses.isDragging);

    this.hoveredTaskElement?.classList.remove(this.stateClasses.isHovered);
    this._hoveredTaskElement = null;

    taskElement.removeAttribute("style");
    rootElements.rootBody.removeAttribute("style");
    cloneElement.remove();
    this.restoreDefaults();
  };

  autoScroll = (timeStamp) => {
    if (!this.dragState.isDragging) return;

    this.updateHoverTaskElement(timeStamp);

    const tasksListCoords = this.tasksListElement.getBoundingClientRect();
    this.listBounds = {
      tasksListCoords,
      tasksListTop: tasksListCoords.top,
      tasksListBottom: tasksListCoords.bottom - this.dragConfig.taskHeight,
    };

    const { rootHTML } = rootElements;

    this.scrollState.isMaxScroll = tasksListCoords.top >= -this.dragConfig.tolerance;
    this.scrollState.isMinScroll = tasksListCoords.bottom <= rootHTML.clientHeight + this.dragConfig.tolerance;

    if (this.scrollState.lastScrollTime <= 0) {
      this.scrollState.lastScrollTime = timeStamp;
    }

    const deltaSeconds = Math.min(
      (timeStamp - this.scrollState.lastScrollTime) / 1000,
      this.scrollConfig.maxDeltaSeconds,
    );
    this.scrollState.lastScrollTime = timeStamp;

    const { top } = this.dragState;
    const { viewportTopForScroll, viewportBottomForScroll } = this.viewportBounds;

    if (top <= viewportTopForScroll && !this.scrollState.isMaxScroll) {
      const scrollTopUp = -this.getScrollTop(viewportTopForScroll - top, deltaSeconds);
      scrollRootByY(scrollTopUp);

      if (this.listBounds.tasksListCoords.top >= -this.dragConfig.autoScrollThreshold) {
        showToast({ text: this.toastText.listStart });
      }
    } else if (top >= viewportBottomForScroll && !this.scrollState.isMinScroll) {
      const scrollTopDown = this.getScrollTop(top - viewportBottomForScroll, deltaSeconds);
      scrollRootByY(scrollTopDown);

      if (this.listBounds.tasksListCoords.bottom <= rootHTML.clientHeight + this.dragConfig.autoScrollThreshold) {
        showToast({ text: this.toastText.listEnd });
      }
    }

    this.setBoundsTop();
    requestAnimationFrame(this.autoScroll);
  };

  restoreDefaults() {
    this.dragState = { ...this.initDragState };
    this.dragConfig = { ...this.initDragConfig };
    this.scrollState = { ...this.initScrollState };
    this.scrollConfig = { ...this.initScrollConfig };
    this.viewportBounds = { ...this.initViewportBounds };
    this.listBounds = { ...this.initListBounds };
  }

  getScrollTop(distance, deltaSeconds) {
    const { baseSpeed, maxSpeed, sensCoefficient } = this.scrollConfig;
    const speedPerSecond = Math.min(baseSpeed + distance * sensCoefficient, maxSpeed);

    return speedPerSecond * deltaSeconds;
  }

  setBoundsTop() {
    let { top } = this.dragState;

    const { viewportTop, viewportBottom } = this.viewportBounds;
    const { tasksListTop, tasksListBottom } = this.listBounds;

    top = Math.max(viewportTop, Math.min(top, viewportBottom));
    top = Math.max(tasksListTop, Math.min(top, tasksListBottom));

    this.dragState.top = top;
    this.setTaskTop(top);
  }

  setTaskTop(top) {
    this.dragState.taskElement.style.top = `${top}px`;
  }

  updateHoverTaskElement(timeStamp) {
    if (timeStamp - this.scrollState.lastCheckTime < this.scrollConfig.checkIntervalTime) return;

    const { swapThreshold } = this.dragConfig;
    this.scrollState.lastCheckTime = timeStamp;

    const taskElementCoords = this.dragState.taskElement.getBoundingClientRect();
    this.hoveredTaskElement = getTaskElementFromPoint(
      taskElementCoords.left + swapThreshold,
      taskElementCoords.top + swapThreshold,
    );
  }

  get hoveredTaskElement() {
    return this._hoveredTaskElement;
  }

  set hoveredTaskElement(taskElement) {
    if (!taskElement) return;

    if (this._hoveredTaskElement && this._hoveredTaskElement !== taskElement) {
      this._hoveredTaskElement.classList.remove(this.stateClasses.isHovered);
    }

    taskElement.classList.add(this.stateClasses.isHovered);
    this._hoveredTaskElement = taskElement;
  }
}

export default DragAndDrop;
