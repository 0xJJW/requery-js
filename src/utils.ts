import { getElementContext } from "@/context";
import { RqDirectiveCallback, RqEffectOptions } from "@/types";
import { effect } from "@vue/reactivity";

export function createDisposableEffect<T>({
  element,
  value,
  onCleanup = () => null as T,
  effect: effectFn,
}: RqEffectOptions<T>): () => void {
  const ctx = getElementContext(element);
  let isDisposed = false;
  let runEffect: (() => void) | null = null;
  let currentValue = value;

  const getter = () => {
    if (isDisposed) return onCleanup(currentValue);
    if (typeof currentValue === "function" && "call" in currentValue) {
      return (currentValue as RqDirectiveCallback<T>)(element);
    }
    if (
      currentValue &&
      typeof currentValue === "object" &&
      "value" in currentValue
    ) {
      return currentValue.value;
    }
    return currentValue as T;
  };

  runEffect = () => {
    if (isDisposed) return;
    effectFn(getter);
  };

  const stopEffect = effect(runEffect);

  const cleanup = () => {
    isDisposed = true;
    stopEffect();
    runEffect = null;
    currentValue = onCleanup(currentValue);
  };

  ctx.cleanups.add(cleanup);

  return cleanup;
}

export function nodeNotFoundWarning(name: string) {
  console.warn(`Element "${name}", not found`);
}

export function kebabToCamelCase(str: string) {
  return str.replace(/-([a-z])/g, (_match, group1) => group1.toUpperCase());
}

export function toKebabCase(str: string): string {
  if (!str || typeof str !== "string") return "";

  let result = str[0].toLowerCase();

  for (let i = 1; i < str.length; i++) {
    const char = str[i];
    if (
      char === char.toUpperCase() &&
      char.toLowerCase() !== char.toUpperCase()
    ) {
      if (i > 1 && str[i - 1] === str[i - 1].toUpperCase()) {
        result += char.toLowerCase();
      } else {
        result += "-" + char.toLowerCase();
      }
    } else {
      result += char;
    }
  }

  return result;
}

export function deepCompare(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== "object" || typeof obj2 !== "object") return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key) || !deepCompare(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}
