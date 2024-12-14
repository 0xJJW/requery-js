import { RqDirectiveCallback, RqElement } from "@/types";
import { createDisposableEffect } from "@/utils";
import { Ref } from "@vue/reactivity";

export function _show(
  element: RqElement,
  value: Ref<boolean> | RqDirectiveCallback<boolean> | boolean
): RqElement {
  const initialDisplay = element.node?.style.display || "";

  createDisposableEffect<boolean>({
    element,
    value,
    onCleanup: () => false,
    effect: (getter) => {
      if (!element.node) return;
      element.node.style.display = getter() ? initialDisplay : "none";
    },
  });

  return element;
}
