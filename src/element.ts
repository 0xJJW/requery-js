import {
  ElementContext,
  elementContextMap,
  getElementContext,
} from "@/context.ts";
import { RqComponent, RqElement, RqNode } from "@/types.ts";
import { nodeNotFoundWarning } from "@/utils.ts";

import { _bind } from "@/directives/bind.ts";
import { _for, _forNonKeyed } from "@/directives/for.ts";
import { _html } from "@/directives/html.ts";
import { _if } from "@/directives/if.ts";
import { _on } from "@/directives/on.ts";
import { _query } from "@/directives/query.ts";
import { _show } from "@/directives/show.ts";
import { _text } from "@/directives/text.ts";

export const attributeKey = "rq";
export const cloakAttribute = "rq-cloak";

export function el(
  name: string,
  component: RqComponent,
  node?: RqNode | null,
  parent?: RqElement
): RqElement {
  if (parent) {
    const parentCtx = getElementContext(parent);
    const existingElement = parentCtx.children.get(name);
    if (existingElement) {
      return existingElement;
    }
  }

  if (!node) {
    node = component?.querySelector(
      `[${attributeKey}="${name}"]`
    ) as RqNode | null;

    if (!node) {
      nodeNotFoundWarning(name);
    }
  }

  const ctx = new ElementContext(name, component, node);

  const element: RqElement = {
    get name() {
      return ctx.name;
    },
    get node() {
      return ctx.node;
    },
    get parent() {
      return ctx.parent;
    },
    get elements() {
      return ctx.children;
    },
    bind: (property, value) => _bind(element, property, value),
    on: (eventName, handler) => _on(element, eventName, handler),
    html: (value) => _html(element, value),
    show: (value) => _show(element, value),
    text: (value) => _text(element, value),
    query: (name) => _query(element, name),
    if: (condition, setup) => {
      ctx.valueGetter.set("if", condition);
      if (ctx.node) {
        _if(element, setup);
      } else {
        nodeNotFoundWarning(name);
      }
      return element;
    },
    for: ((...args: any[]) => {
      const [items, keyFnOrSetup, setup] = args;
      ctx.valueGetter.set("for", items);

      if (setup) {
        return _for(element, items, keyFnOrSetup, setup);
      } else {
        return _forNonKeyed(element, items, keyFnOrSetup);
      }
    }) as RqElement["for"],
    dispose: () => {
      ctx.dispose();
      elementContextMap.delete(element);
    },
    onMounted: (cb: () => (() => void) | void) => {
      ctx.onMounted(cb);
      return element;
    },
  };

  elementContextMap.set(element, ctx);

  if (parent) {
    const parentCtx = getElementContext(parent);
    parentCtx.children.set(name, element);
    ctx.parent = parent;
  }

  ctx.isMounted = true;
  ctx.mountedCallbacks.forEach((cb) => {
    const cleanup = cb();
    if (cleanup) {
      ctx.cleanups.add(cleanup);
    }
  });
  ctx.mountedCallbacks.clear();

  ctx.node?.removeAttribute(cloakAttribute);

  return element;
}

export function clearElementBindings(element: RqElement | undefined | null) {
  if (!element) return;
  const ctx = getElementContext(element);

  ctx.children.forEach((child) => {
    clearElementBindings(child);
  });

  ctx.cleanups.forEach((cleanup) => cleanup());
  ctx.cleanups.clear();
  ctx.valueGetter.clear();
}
