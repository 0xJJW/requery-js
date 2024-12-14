import { RqDirectiveCallback, RqElement } from "@/types";
import { createDisposableEffect } from "@/utils";
import { Ref } from "@vue/reactivity";

export function _html(
  element: RqElement,
  value: Ref<string> | RqDirectiveCallback<string> | string
): RqElement {
  createDisposableEffect<string>({
    element,
    value,
    onCleanup: () => "",
    effect: (getter) => {
      if (!element.node) return;
      element.node.innerHTML = getter();
    },
  });

  return element;
}
