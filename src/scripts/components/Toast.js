import { CUSTOM_EVENTS, GLOBAL_CLASSES } from "../constants/constants.js";
import { rootElements } from "../utils/index.js";

class Toast {
  toastTimerId;
  toastCurrElement;

  selectors = {
    toastContainer: "[data-js-toast-container]",
  };

  stateClasses = {
    isInfo: "is-info",
    isWarning: "is-warning",
  };

  baseClasses = {
    toast: "toast-container__toast",
  };

  toastConfig = {
    offset: 4,
    minHeightKeyboard: 150,
  };

  aria = {
    role: {
      name: "role",
      values: {
        status: "status",
        alert: "alert",
      },
    },
    live: {
      name: "aria-live",
      values: {
        polite: "polite",
        assertive: "assertive",
      },
    },
  };

  constructor() {
    this.toastContainerElement = rootElements.rootBody.querySelector(this.selectors.toastContainer);

    this.bindEvents();
  }

  bindEvents() {
    document.addEventListener(CUSTOM_EVENTS.TOAST_ADD, this.handleShowToast);

    window.visualViewport.addEventListener("resize", this.handleToastPosition);
  }

  handleShowToast = (event) => {
    const { text, isInfo = true, ms = 2000, handleRemove = null } = event.detail;

    if (!this.toastCurrElement) {
      this.toastCurrElement = this.getToastElement(text, isInfo);
    }

    if (this.toastCurrElement.textContent !== text) {
      this.toastCurrElement.dispatchEvent(new CustomEvent(CUSTOM_EVENTS.TOAST_REMOVE));
      this.toastCurrElement = this.getToastElement(text, isInfo);
    }

    if (this.toastTimerId) clearTimeout(this.toastTimerId);

    this.toastCurrElement.classList.remove(GLOBAL_CLASSES.IS_ANIMATED);

    if (!this.toastContainerElement.contains(this.toastCurrElement)) {
      this.toastContainerElement.innerHTML = "";
      this.toastContainerElement.append(this.toastCurrElement);

      if (!handleRemove) {
        this.toastCurrElement.addEventListener(CUSTOM_EVENTS.TOAST_REMOVE, handleRemove, { once: true });
      }
    }

    this.handleToastPosition();

    this.toastTimerId = setTimeout(() => {
      this.toastCurrElement.classList.add(GLOBAL_CLASSES.IS_ANIMATED);
      this.toastTimerId = null;
    }, ms);
  };

  handleToastPosition = () => {
    if (!this.toastCurrElement) return;

    const { offset, minHeightKeyboard } = this.toastConfig;

    const keyboardHeight = window.innerHeight - window.visualViewport.height;
    const isKeyboardOpen = keyboardHeight >= minHeightKeyboard;

    const toastStyles = this.toastCurrElement.style;

    if (isKeyboardOpen) {
      toastStyles.bottom = `${keyboardHeight + offset}px`;
    } else {
      toastStyles.bottom = "";
    }
  };

  getToastElement(text, isInfo = true) {
    const toast = document.createElement("div");
    const typeClass = isInfo ? this.stateClasses.isInfo : this.stateClasses.isWarning;

    toast.classList.add(this.baseClasses.toast, typeClass);
    toast.textContent = text;

    const { role, live } = this.aria;
    toast.setAttribute(role.name, isInfo ? role.values.status : role.values.alert);
    toast.setAttribute(live.name, isInfo ? live.values.polite : live.values.assertive);

    return toast;
  }
}

export default Toast;
