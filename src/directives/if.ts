import { getElementContext } from "@/context";
import { RqElement } from "@/types";
import { createDisposableEffect, nodeNotFoundWarning } from "@/utils";

export function _if(
  element: RqElement,
  setup?: (element: RqElement) => void
): void {
  // Get context
  const ctx = getElementContext(element);

  // Check if element exists
  if (!element.node) {
    nodeNotFoundWarning(element.name);
    return;
  }

  // Create anchor element
  const placeholder = document.createComment(` [if] ${element.name} `);

  // Clone template
  const template = element.node.cloneNode(true) as Element;

  // Insert anchor element and remove original element
  element.node.before(placeholder);
  element.node.remove();

  // Initialize state
  let isRendered = false;
  let ifCleanup: (() => void) | null = null;

  // Clear state but preserve `if` value getter
  const cleanup = () => {
    ctx.children.forEach((child: RqElement) => child.dispose());
    ctx.children.clear();
    ctx.eventListeners.clear();
    ctx.cleanups.forEach((cleanup: () => void) => {
      if (cleanup !== ifCleanup) cleanup();
    });
    ctx.valueGetter.forEach((_, key) => {
      if (key !== "if") {
        ctx.valueGetter.delete(key);
      }
    });
  };

  // Render
  const render = (shouldRender: boolean) => {
    if (shouldRender === isRendered) return;

    if (shouldRender) {
      // Show
      const newElement = template.cloneNode(true) as Element;
      placeholder.parentNode?.replaceChild(newElement, placeholder);

      // Update the context
      cleanup();
      ctx.node = newElement as any;

      // Run setup if provided
      if (setup) {
        setup(element);
      }
    } else {
      // Hide
      if (ctx.node?.parentNode) {
        ctx.node.parentNode.replaceChild(placeholder, ctx.node);
      }

      // Reset the context
      cleanup();
      ctx.node = null;
    }

    // Update rendered state
    isRendered = shouldRender;
  };

  ifCleanup = createDisposableEffect<boolean>({
    element,
    value: ctx.valueGetter.get("if")!,
    onCleanup: () => false,
    effect: (getter) => {
      render(getter());
    },
  });

  return;
}
