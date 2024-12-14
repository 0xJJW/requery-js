import { getElementContext } from "@/context";
import { _query } from "@/directives/query.ts";
import { clearElementBindings, el } from "@/element.ts";
import { queueJob } from "@/scheduler.ts";
import { RqElement, RqNode } from "@/types.ts";
import { deepCompare, nodeNotFoundWarning } from "@/utils.ts";
import { watch } from "@vue/reactivity";

export function _forNonKeyed<T extends object>(
  element: RqElement,
  getValue: () => T[],
  setup: (element: RqElement, item: T) => void
): void {
  _for(element, getValue, undefined, setup);
}

export function _for<T extends object>(
  element: RqElement,
  getValue: () => T[],
  keyFn: ((item: T) => any) | undefined,
  setup: (element: RqElement, item: T) => void
): void {
  // Get context
  const ctx = getElementContext(element);

  // Check if element exists
  if (!element.node) {
    nodeNotFoundWarning(element.name);
    return;
  }

  // Update context
  ctx.clones = [];
  ctx.keyToIndexMap = new Map();

  // Create placeholders
  const anchorStart = document.createComment(`[for:start] ${element.name}`);
  const anchorEnd = document.createComment(`[for:end] ${element.name}`);

  // Insert placeholders
  element.node.before(anchorStart);
  element.node.after(anchorEnd);
  element.node.remove();

  // Clone template
  let renderTemplate: RqNode = element.node.cloneNode(true) as RqNode;

  // Initialize watchers
  const forWatchers: Array<() => void> = [];

  const setupItemWatcher = (index: number) => {
    // Clear existing watcher if any
    if (forWatchers[index]) {
      forWatchers[index]();
    }

    // Setup watcher
    const stopItemWatch = watch(
      () => getValue()[index],
      (newVal, oldVal) => {
        if (!deepCompare(newVal, oldVal)) {
          const currentClone = ctx.clones[index];
          if (!currentClone) return;

          clearElementBindings(currentClone);
          setup(currentClone, newVal);
        }
      },
      { deep: false }
    );

    // Add to watchers array
    forWatchers[index] = stopItemWatch;
    return stopItemWatch;
  };

  const cleanupExcessWatchers = (newLength: number) => {
    while (forWatchers.length > newLength) {
      const watcher = forWatchers.pop();
      if (watcher) {
        watcher();
      }
    }
  };

  const cloneRef = (key: any, item: T): RqElement => {
    const cloneEl: RqNode = renderTemplate.cloneNode(true) as RqNode;
    const cloneRef = el(key.toString(), ctx.component, cloneEl, element);
    const cloneCtx = getElementContext(cloneRef);

    // Setup clone context
    cloneCtx.key = key;
    cloneCtx.isClone = true;
    ctx.clones.push(cloneRef);
    cloneRef.query = (name: string) => _query(cloneRef, name);

    // Clear bindings
    clearElementBindings(cloneRef);

    // Setup value getter
    cloneCtx.valueGetter.set("for:item", () => {
      const currentIndex = ctx.keyToIndexMap.get(key);
      return currentIndex !== undefined ? getValue()[currentIndex] : undefined;
    });

    // Run setup
    setup(cloneRef, item);

    return cloneRef;
  };

  const renderNonKeyed = (items: T[]) => {
    if (!items || !Array.isArray(items)) {
      console.error("Invalid array in for:", items);
      return;
    }

    // Clear key to index map
    ctx.keyToIndexMap.clear();

    // Remove excess clones
    while (ctx.clones.length > items.length) {
      const lastClone = ctx.clones.pop()!;
      lastClone.dispose();
    }

    // Cleanup excess watchers
    cleanupExcessWatchers(items.length);

    for (let i = 0; i < items.length; i++) {
      // Set key to index mapping
      ctx.keyToIndexMap.set(i, i);

      // Reuse existing clone if available
      if (i < ctx.clones.length) {
        const currentClone = ctx.clones[i];
        const currentCloneCtx = getElementContext(currentClone);
        const item = items[i];

        // Clear bindings
        clearElementBindings(currentClone);

        // Setup clone context
        currentCloneCtx.key = i;
        currentCloneCtx.name = i.toString();
        currentCloneCtx.valueGetter.set("for:item", () => getValue()[i]);

        // Run setup
        setup(currentClone, item);
      } else {
        // Create new clone
        const newRef = cloneRef(i, items[i]);
        anchorEnd.before(newRef.node!);
      }

      // Setup watcher
      setupItemWatcher(i);
    }
  };

  const renderKeyed = (items: T[], keyFn: (item: T) => any, oldItems?: T[]) => {
    if (!items || !Array.isArray(items)) {
      console.error("Invalid array in for:", items);
      return;
    }

    // Create new key to index map to track changes
    const prevKeyToIndexMap = new Map(ctx.keyToIndexMap);
    const newKeyToIndexMap = new Map<any, number>();

    // Initialize new clones array
    const newClones: RqElement[] = new Array(items.length);

    // Get parent
    const parent = anchorEnd.parentNode;
    if (!parent) return;

    // Build new key to index map
    items.forEach((item, index) => {
      const key = keyFn(item);
      newKeyToIndexMap.set(key, index);
    });
    ctx.keyToIndexMap = newKeyToIndexMap;

    // Initialize index and nextRef
    let i = items.length;
    let nextRef: Node = anchorEnd;

    while (i--) {
      const item = items[i];
      const key = keyFn(item);
      const oldIndex = prevKeyToIndexMap.get(key);

      if (oldIndex === undefined) {
        // New item - insert before nextRef
        const newRef = cloneRef(key, item);
        parent.insertBefore(newRef.node!, nextRef);
        nextRef = newRef.node!;
        newClones[i] = newRef;
      } else {
        // Existing item - only move if needed
        const currentClone = ctx.clones[oldIndex];
        if (!currentClone?.node) continue;

        // Check if the value actually changed
        const oldItem = oldItems?.[oldIndex];
        const needsUpdate = !oldItems || !deepCompare(item, oldItem);

        if (needsUpdate) {
          // Clear bindings and run setup
          clearElementBindings(currentClone);
          setup(currentClone, item);

          // Update value getter
          const currentCloneCtx = getElementContext(currentClone);
          currentCloneCtx.valueGetter.set("for:item", () => getValue()[i]);
        }

        // Move if needed
        if (currentClone.node.nextSibling !== nextRef) {
          parent.insertBefore(currentClone.node, nextRef);
        }

        // Update nextRef
        nextRef = currentClone.node;

        // Add to new clones array
        newClones[i] = currentClone;
      }
    }

    // Remove unused clones
    ctx.clones.forEach((clone) => {
      const cloneCtx = getElementContext(clone);
      if (!newKeyToIndexMap.has(cloneCtx.key)) {
        clone.dispose();
      }
    });

    ctx.clones = newClones;
  };

  const isArrayShuffled = (
    items: T[],
    keyFn: (item: T) => any,
    prevKeyToIndexMap: Map<any, number>
  ): boolean => {
    // Check if the length is different
    if (items.length !== ctx.clones.length) return false;

    // Check if all the keys exist in the previous map
    for (const item of items) {
      const key = keyFn(item);
      if (!prevKeyToIndexMap.has(key)) return false;
    }

    return true;
  };

  const renderShuffle = (
    items: T[],
    keyFn: (item: T) => any,
    oldItems?: T[]
  ) => {
    // Create new key to index map to track changes
    const prevKeyToIndexMap = new Map(ctx.keyToIndexMap);
    const newKeyToIndexMap = new Map<any, number>();

    // Initialize new clones array
    const newClones: RqElement[] = new Array(items.length);

    // Get parent
    const parent = anchorEnd.parentNode;
    if (!parent) return;

    // First pass: identify which positions have changed
    const changedPositions = new Set<number>();
    items.forEach((item, newIndex) => {
      const key = keyFn(item);
      newKeyToIndexMap.set(key, newIndex);
      const oldIndex = prevKeyToIndexMap.get(key);

      if (oldIndex !== newIndex) {
        changedPositions.add(newIndex);
      }
    });

    // If nothing changed, return
    if (changedPositions.size === 0) {
      return;
    }

    // Move unchanged items directly
    items.forEach((item, i) => {
      if (!changedPositions.has(i)) {
        const key = keyFn(item);
        const oldIndex = prevKeyToIndexMap.get(key)!;
        newClones[i] = ctx.clones[oldIndex];
      }
    });

    // Find the first unchanged position after each changed position
    let nextRef: Node = anchorEnd;
    let i = items.length;

    while (i--) {
      // If the item is unchanged, update nextRef
      if (!changedPositions.has(i)) {
        const clone = newClones[i];
        if (!clone?.node) continue;
        nextRef = clone.node;
        continue;
      }

      // Get the item and its key
      const item = items[i];
      const key = keyFn(item);

      // Get the old index and current clone
      const oldIndex = prevKeyToIndexMap.get(key)!;
      const currentClone = ctx.clones[oldIndex];
      if (!currentClone?.node) continue;

      // Move if the clone is not already in the correct position
      if (currentClone.node.nextSibling !== nextRef) {
        parent.insertBefore(currentClone.node, nextRef);
      }

      // Update bindings if value changed
      if (oldItems && !deepCompare(item, oldItems[oldIndex])) {
        // Clear bindings and run setup
        clearElementBindings(currentClone);
        setup(currentClone, item);

        // Update value getter
        const currentCloneCtx = getElementContext(currentClone);
        currentCloneCtx.valueGetter.set("for:item", () => getValue()[i]);
      }

      // Update nextRef
      nextRef = currentClone.node;

      // Add to new clones array
      newClones[i] = currentClone;
    }

    // Update key to index map and clones
    ctx.keyToIndexMap = newKeyToIndexMap;
    ctx.clones = newClones;
  };

  const render = (oldItems?: T[]) => {
    queueJob(() => {
      const items = getValue();
      if (!keyFn) {
        renderNonKeyed(items);
      } else if (isArrayShuffled(items, keyFn, ctx.keyToIndexMap)) {
        renderShuffle(items, keyFn, oldItems);
      } else {
        renderKeyed(items, keyFn, oldItems);
      }
    });
  };

  // Watch for changes to array length and list assignment
  const stopWatch = watch(
    () => {
      const items = getValue();
      return [items.length, items];
    },
    ([newLength, newItems], [oldLength, oldItems]) => {
      // Only proceed if the array actually changed
      if (newLength !== oldLength || newItems !== oldItems) {
        // Immediately cleanup excess watchers if array got smaller
        if (newLength < oldLength) {
          while (forWatchers.length > newLength) {
            const watcher = forWatchers.pop();
            if (watcher) {
              watcher();
            }
          }
        }

        render(oldItems);
      }
    },
    { deep: false }
  );

  // Initial render
  render();

  ctx.cleanups.add(() => {
    // Stop all item watchers
    while (forWatchers.length > 0) {
      const watcher = forWatchers.pop();
      if (watcher) {
        watcher();
      }
    }

    // Stop array watcher
    stopWatch();

    // Clear bindings and dispose of clones
    ctx.clones.forEach((clone) => {
      if (clone) {
        clone.dispose();
      }
    });

    // Remove placeholders
    if (anchorStart.parentNode) {
      anchorStart.remove();
    }
    if (anchorEnd.parentNode) {
      anchorEnd.remove();
    }
  });

  return;
}
