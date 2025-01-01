import { RqDirectiveCallback, RqElement, RqNode } from "@/types";
import { createDisposableEffect } from "@/utils";
import type { Ref } from "@vue/reactivity";
import {
  hyphenate,
  isArray,
  isString,
  normalizeClass,
  normalizeStyle,
} from "@vue/shared";

const importantRE = /\s*!important$/;

export type NormalizedStyle = Record<string, string | number>;

export function _bind<T>(
  element: RqElement,
  property: string,
  value: Ref<T> | RqDirectiveCallback<T> | T
): RqElement {
  let prevValue: T | undefined;

  const el = element.node;
  if (el && property === "class" && !el._class && el.getAttribute("class")) {
    el._class = el.getAttribute("class") ?? undefined;
  }

  createDisposableEffect<T>({
    element,
    value,
    onCleanup: () => null as T,
    effect: (getter) => {
      const newValue = getter();
      if (!element.node) return;
      setProp(element.node, property, newValue, prevValue);
      prevValue = newValue;
    },
  });

  return element;
}

const setStyle = (
  style: CSSStyleDeclaration,
  name: string,
  val: string | string[]
) => {
  if (isArray(val)) {
    val.forEach((v) => setStyle(style, name, v));
  } else {
    if (name.startsWith("--")) {
      style.setProperty(name, val);
    } else {
      if (importantRE.test(val)) {
        style.setProperty(
          hyphenate(name),
          val.replace(importantRE, ""),
          "important"
        );
      } else {
        style[name as any] = val;
      }
    }
  }
};

export function setProp(el: RqNode, key: string, value: any, prevValue: any) {
  let actualValue = typeof value === "function" ? value() : value;

  if (key === "textContent") {
    el.textContent = actualValue ?? "";
  } else if (key === "class") {
    // Use stored static class when combining classes
    el.setAttribute(
      "class",
      normalizeClass(el._class ? [el._class, actualValue] : actualValue) || ""
    );
  } else if (key.startsWith("class.")) {
    const [_, className] = key.split(".");
    el.classList.toggle(className, actualValue);
  } else if (key === "style") {
    actualValue = normalizeStyle(actualValue);
    const { style } = el as HTMLElement;
    if (!actualValue) {
      el.removeAttribute("style");
    } else if (isString(actualValue)) {
      if (actualValue !== prevValue) style.cssText = actualValue;
    } else {
      for (const key in actualValue) {
        setStyle(style, key, actualValue[key]);
      }
      if (prevValue && !isString(prevValue)) {
        for (const key in prevValue) {
          if (actualValue[key] == null) {
            setStyle(style, key, "");
          }
        }
      }
    }
  } else if (key === "value") {
    if (el instanceof HTMLInputElement) {
      el.value = actualValue ?? "";
    } else if (el instanceof HTMLTextAreaElement) {
      el.value = actualValue ?? "";
    }
  } else if (key.startsWith("prop:")) {
    el.setAttribute(key, actualValue);
  } else if (
    actualValue !== null &&
    actualValue !== undefined &&
    actualValue !== false
  ) {
    el.setAttribute(key, actualValue);
  } else {
    el.removeAttribute(key);
  }
}
