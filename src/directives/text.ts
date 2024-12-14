import { RqDirectiveCallback, RqElement } from "@/types";
import { createDisposableEffect } from "@/utils";
import { Ref } from "@vue/reactivity";
import { isObject } from "@vue/shared";

export const toDisplayString = (value: any) =>
  value == null
    ? ""
    : isObject(value)
    ? JSON.stringify(value, null, 2)
    : String(value);

export function _text(
  element: RqElement,
  value: Ref<string> | RqDirectiveCallback<string> | string
): RqElement {
  createDisposableEffect<string>({
    element,
    value,
    onCleanup: () => "",
    effect: (getter) => {
      const newValue = getter();
      if (!element.node) return;
      element.node.textContent = toDisplayString(newValue);
    },
  });

  return element;
}
