import { RqComponent, RqElement, RqNode } from "@/types";

export const elementContextMap = new WeakMap<RqElement, ElementContext>();

export class ElementContext {
  key?: any;
  name: string;
  isClone = false;
  isMounted = false;
  node: RqNode | null;
  clones: RqElement[] = [];
  parent: RqElement | null = null;
  cleanups = new Set<() => void>();
  keyToIndexMap = new Map<any, number>();
  children = new Map<string, RqElement>();
  valueGetter = new Map<string, () => any>();
  eventListeners = new Map<string, EventListener>();
  mountedCallbacks = new Set<() => (() => void) | void>();

  constructor(
    name: string,
    public readonly component: RqComponent,
    node: RqNode | null
  ) {
    this.name = name;
    this.node = node;
  }

  onMounted(cb: () => (() => void) | void) {
    if (this.isMounted) {
      // Component is already mounted, run callback immediately
      const cleanup = cb();
      if (cleanup) {
        this.cleanups.add(cleanup);
      }
    } else {
      // Store callback for later
      this.mountedCallbacks.add(cb);
    }
  }

  dispose() {
    // Dispose of clones
    this.clones.forEach((clone) => {
      clone.dispose();
    });
    this.clones.length = 0;

    // Dispose of children
    this.children.forEach((child) => {
      child.dispose();
    });
    this.children.clear();

    // Run onMounted cleanup functions
    this.mountedCallbacks.forEach((cb) => {
      try {
        const cleanup = cb();
        if (cleanup) {
          cleanup();
        }
      } catch (e) {
        console.error("Error in mounted callback cleanup:", e);
      }
    });
    this.mountedCallbacks.clear();

    // Clear key to index map
    this.keyToIndexMap.clear();

    // Remove all event listeners
    if (this.node) {
      this.eventListeners.forEach((listener, eventName) => {
        this.node?.removeEventListener(eventName, listener);
      });
    }
    this.eventListeners.clear();

    // Run all cleanup functions
    this.cleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch (e) {
        console.error("Error in cleanup for element:", this.name, e);
      }
    });
    this.cleanups.clear();

    // Clear all value getters
    this.valueGetter.clear();

    // Update parent
    if (this.parent) {
      const parentCtx = getElementContext(this.parent);
      parentCtx.children.delete(this.name);
      if (this.isClone) {
        const index = parentCtx.keyToIndexMap.get(this.key);
        if (index !== undefined) {
          parentCtx.clones.splice(index, 1);
        }
      }
      this.parent = null;
    } else {
      // Remove from component's elements map only if it's a top-level element
      this.component.components.delete(this.name);
    }

    // Remove the element
    if (this.node) {
      this.node.remove();
      this.node = null;
    }
  }
}

export function getElementContext(element: RqElement): ElementContext {
  const context = elementContextMap.get(element);
  if (!context) {
    throw new Error("Element context not found");
  }
  return context;
}
