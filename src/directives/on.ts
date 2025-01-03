import { getElementContext } from "@/context";
import { RqElement, RqElementEvent, RqElementEventHandler } from "@/types";
import { nodeNotFoundWarning } from "@/utils";

export function _on(
  element: RqElement,
  eventName: string,
  handler: RqElementEventHandler
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
  const wrappedHandler = ((e: Event) => {
    const rqEvent = e as RqElementEvent;
    rqEvent.element = element;
    handler(rqEvent);
  }) as EventListener;
  element.node.addEventListener(eventName, wrappedHandler);
  ctx.eventListeners.set(eventName, wrappedHandler);
  ctx.cleanups.add(() =>
    element.node?.removeEventListener(eventName, wrappedHandler)
  );

  return element;
}
