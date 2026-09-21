import { LOCAL_STORAGE_KEYS } from "../constants/constants.js";

const storage = {
  save(key, value, isJson = false) {
    localStorage.setItem(key, isJson ? JSON.stringify(value) : value);
  },

  get(key, isJson = false) {
    const item = localStorage.getItem(key);

    if (item === null) return null;

    if (!isJson) return item;

    try {
      return JSON.parse(item);
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.log(`Error during JSON parsing: ${error}`);
        return null;
      }
      throw error;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },
};

const taskStorage = {
  get taskListFromStorage() {
    return storage.get(LOCAL_STORAGE_KEYS.TASK_LIST, true) ?? [];
  },

  saveTaskList(newTaskList) {
    storage.save(LOCAL_STORAGE_KEYS.TASK_LIST, newTaskList, true);
  },

  removeTaskList() {
    storage.remove(LOCAL_STORAGE_KEYS.TASK_LIST);
  },
};

export { storage, taskStorage };
