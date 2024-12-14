import { getElementContext } from "@/context";
import { RqElement, RqEventListener } from "@/types";
import { nodeNotFoundWarning } from "@/utils";

export function _on(
  element: RqElement,
  eventName: string,
  handler: RqEventListener
): RqElement {
  const ctx = getElementContext(element);

  if (!element.node) {
    nodeNotFoundWarning(element.name);
    return element;
  }

  // Clean up existing listeners
  const existingHandler = ctx.eventListeners.get(eventName);
  if (existingHandler) {
    element.node.removeEventListener(eventName, existingHandler);
    ctx.cleanups.delete(() =>
      element.node?.removeEventListener(eventName, existingHandler)
    );
  }

  // Add new listener
  const wrappedHandler = ((e: Event) => handler(element, e)) as EventListener;
  element.node.addEventListener(eventName, wrappedHandler);
  ctx.eventListeners.set(eventName, wrappedHandler);
  ctx.cleanups.add(() =>
    element.node?.removeEventListener(eventName, wrappedHandler)
  );

  return element;
}
