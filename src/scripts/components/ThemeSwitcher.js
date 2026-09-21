import { LOCAL_STORAGE_KEYS, GLOBAL_CLASSES } from "../constants/constants.js";
import { storage, rootElements } from "../utils/index.js";

class ThemeSwitcher {
  selectors = {
    themeSwitcherBtn: "[data-js-theme-switcher-btn]",
    themeSwitcherSvgSun: "[data-js-theme-switcher-svg-sun]",
    themeSwitcherSvgMoon: "[data-js-theme-switcher-svg-moon]",
  };

  stateClasses = {
    isDarkTheme: "is-dark-theme",
  };

  aria = {
    label: {
      name: "aria-label",
      values: {
        switchToLight: "Switch to light theme",
        switchToDark: "Switch to dark theme",
      },
    },
  };

  themes = {
    light: "light",
    dark: "dark",
  };

  constructor() {
    const { rootTodo } = rootElements;

    this.themeSwitcherBtnElement = rootTodo.querySelector(this.selectors.themeSwitcherBtn);
    this.themeSwitcherSvgSunElement = rootTodo.querySelector(this.selectors.themeSwitcherSvgSun);
    this.themeSwitcherSvgMoonElement = rootTodo.querySelector(this.selectors.themeSwitcherSvgMoon);

    this.initTheme();
    this.bindEvents();
  }

  initTheme() {
    const { THEME } = LOCAL_STORAGE_KEYS;

    const theme = storage.get(THEME);

    if (theme === this.themes.dark) {
      rootElements.rootHTML.classList.add(this.stateClasses.isDarkTheme);
      this.toggleThemeSwitcherSvg();
    }

    if (!theme) {
      storage.save(THEME, this.themes.light);
    }
    this.setThemeButtonAriaLabel();
  }

  bindEvents() {
    this.themeSwitcherBtnElement.addEventListener("click", this.handleThemeSwitcher);
  }

  handleThemeSwitcher = () => {
    const activeSvgElement = this.currentSvgElement();
    const { IS_ANIMATED } = GLOBAL_CLASSES;

    if (activeSvgElement.classList.contains(IS_ANIMATED)) return;

    activeSvgElement.classList.add(IS_ANIMATED);

    activeSvgElement.addEventListener(
      "animationend",
      () => {
        storage.save(LOCAL_STORAGE_KEYS.THEME, this.isDarkThemeCached ? this.themes.light : this.themes.dark);
        rootElements.rootHTML.classList.toggle(this.stateClasses.isDarkTheme, this.isDarkThemeCached);

        this.toggleThemeSwitcherSvg();
        this.setThemeButtonAriaLabel();

        activeSvgElement.classList.remove(IS_ANIMATED);
      },
      { once: true },
    );
  };

  currentSvgElement() {
    return this.isDarkThemeCached ? this.themeSwitcherSvgMoonElement : this.themeSwitcherSvgSunElement;
  }

  toggleThemeSwitcherSvg() {
    const { IS_HIDDEN } = GLOBAL_CLASSES;

    this.themeSwitcherSvgSunElement.classList.toggle(IS_HIDDEN);
    this.themeSwitcherSvgMoonElement.classList.toggle(IS_HIDDEN);
  }

  setThemeButtonAriaLabel() {
    const { switchToLight, switchToDark } = this.aria.label.values;
    const ariaLabelValue = this.isDarkThemeCached ? switchToLight : switchToDark;

    this.themeSwitcherBtnElement.setAttribute(this.aria.label.name, ariaLabelValue);
  }

  get isDarkThemeCached() {
    return storage.get(LOCAL_STORAGE_KEYS.THEME) === this.themes.dark;
  }
}

export default ThemeSwitcher;
