import { el } from "@/element";
import { kebabToCamelCase, toKebabCase } from "@/utils";
import type { Reactive } from "@vue/reactivity";
import { reactive } from "@vue/reactivity";

import {
  RqActionContext,
  RqActions,
  RqBoundActions,
  RqComponent,
  RqComponentOptions,
  RqElement,
  RqNode,
} from "@/types";

const rootComponents = new Map<string, RqComponent>();
const componentInstances = new Map<string, Map<string, RqComponent>>();

/**
 * Get a component instance by name
 * @param name The component name
 * @param key Optional key to find a specific instance
 */
export function queryComponent<
  Props extends object,
  Store extends object,
  Actions extends RqActions<Props, Store> = RqActions<Props, Store>
>(name: string, key?: string): RqComponent<Props, Store, Actions> | null {
  const instances = componentInstances.get(name);

  if (!instances) {
    console.warn(`No instances found for component "${name}"`);
    return null;
  }

  if (key) {
    const instance = instances.get(key);
    if (!instance) throw new Error(`No instance found for key "${key}"`);
    return instance as RqComponent<Props, Store, Actions>;
  }

  const component = instances.values().next().value;
  if (!component) {
    console.warn(`No instances found for component "${name}"`);
    return null;
  }
  return component as RqComponent<Props, Store, Actions>;
}

/**
 * Generates a unique key for a component instance based on:
 * - The explicit key from prop:key attribute if present
 * - The parent component's key as a prefix if the component has a parent
 * - The component name for root level components
 * @param component The component instance
 * @param parent The parent component instance
 * @returns The unique key for the component instance
 */
function getInstanceKey(
  component: RqComponent,
  parent: RqComponent | undefined
): string {
  const keyAttr = component.getAttribute("prop:key") || component.name;

  if (parent) {
    if (parent.components.has(keyAttr)) {
      throw new Error(
        `Multiple instances of component "${component.name}" found in parent "${component.parent?.name}". Each instance must have a unique key.`
      );
    }
  } else {
    if (rootComponents.has(keyAttr)) {
      throw new Error(
        `Multiple instances of root component "${component.name}" found. Each instance must have a unique key.`
      );
    }
  }

  return keyAttr;
}

/**
 * Finds the nearest parent ReQuery component by traversing up the DOM tree
 * Parent components must specify a key attribute (prop:key)
 * @param element The element to find the parent component for
 * @returns The parent component if found
 */
function findParentComponent(element: HTMLElement): RqComponent | undefined {
  let parent = element.parentElement;

  while (parent) {
    if (
      parent.tagName.toLowerCase().includes("-") &&
      parent.hasAttribute("prop:key")
    ) {
      return parent as RqComponent;
    }
    parent = parent.parentElement;
  }
}

/**
 * Waits for a component's initialization to complete
 * @param element The component instance to wait for
 * @returns The component instance
 */
async function waitForComponentInit(
  element: RqComponent
): Promise<RqComponent> {
  await customElements.whenDefined(element.tagName.toLowerCase());
  await element.onParentMounted();
  return element;
}

/**
 * Finds and waits for the nearest parent Web Component to initialize
 * @param element The component instance to find the parent for
 * @returns The parent component instance
 */
async function findParentAndDependencies(
  element: RqComponent
): Promise<RqComponent | undefined> {
  const parentElement = findParentComponent(element);

  if (!parentElement) {
    return undefined;
  }

  const parent = await waitForComponentInit(parentElement);
  return parent;
}

/**
 * Binds actions to the component context
 * @param actions The actions to bind
 * @param context The component context
 * @returns The bound actions
 */
function bindActions<
  Props extends object,
  Store extends object,
  Actions extends RqActions<Props, Store>
>(
  actions: Actions,
  context: RqActionContext<Props, Store>
): RqBoundActions<Actions> {
  const bound = {} as RqBoundActions<Actions>;

  for (const key in actions) {
    bound[key] = ((...args: any[]) => actions[key](context, ...args)) as any;
  }

  return bound;
}

/**
 * Defines a new component
 * @param name The name of the component
 * @param options The component options
 * @param options.props The component props
 * @param options.store The component store
 * @param options.actions The component actions
 * @param options.setup The component setup function
 * @returns The component class
 */
export function defineComponent<
  Props extends object = object,
  Store extends object = object,
  Actions extends RqActions<Props, Store> = RqActions<Props, Store>
>(name: string, options: RqComponentOptions<Props, Store, Actions>) {
  const {
    props = {} as Props,
    store = {} as Store,
    actions = {} as Actions,
    setup,
  } = options;

  if (!customElements.get(name)) {
    class ComponentElement
      extends HTMLElement
      implements RqComponent<Props, Store, Actions>
    {
      key: string;
      name: string;
      props: Reactive<Props>;
      store: Reactive<Store>;
      actions!: RqBoundActions<Actions>;
      mounted: boolean = false;

      #parent: RqComponent | undefined;
      #elements = new Map<string, RqElement>();
      #components = new Map<string, RqComponent>();

      #cleanups = new Set<() => void>();
      #mountedPromise: Promise<void>;
      #resolveMounted!: () => void;
      #parentMountedPromise: Promise<void>;
      #resolveParentMounted!: () => void;

      static get observedAttributes() {
        return Object.keys(props).map((prop) => `prop:${toKebabCase(prop)}`);
      }

      constructor() {
        super();
        this.key = name;
        this.name = name;

        const initialProps = { ...props };
        for (const attr of this.attributes) {
          if (attr.name.startsWith("prop:")) {
            const propName = kebabToCamelCase(
              attr.name.replace("prop:", "")
            ) as keyof Props;
            if (propName in props) {
              initialProps[propName] = this.parseAttributeValue(attr.value);
            }
          }
        }

        this.props = reactive(initialProps);
        this.store = reactive({ ...store });

        this.#mountedPromise = new Promise(
          (resolve) => (this.#resolveMounted = resolve)
        );
        this.#parentMountedPromise = new Promise(
          (resolve) => (this.#resolveParentMounted = resolve)
        );
      }

      private parseAttributeValue(value: string): any {
        if (value === "true") return true;
        if (value === "false") return false;
        if (value === "null") return null;
        if (value === "undefined") return undefined;
        if (!isNaN(Number(value))) return Number(value);
        if (value?.startsWith("[") || value?.startsWith("{")) {
          try {
            return JSON.parse(value);
          } catch (e) {
            // Keep original value if parsing fails
          }
        }

        return value;
      }

      attributeChangedCallback(
        name: string,
        _oldValue: string,
        newValue: string
      ) {
        const propName = kebabToCamelCase(
          name.replace("prop:", "")
        ) as keyof Props;

        if (propName in props) {
          const value = this.parseAttributeValue(newValue);
          this.props[propName as keyof Reactive<Props>] = value;
        }
      }

      async connectedCallback() {
        const parent = await findParentAndDependencies(this);
        this.#resolveParentMounted();
        this.key = getInstanceKey(this, parent);

        if (parent) {
          this.#parent = parent;
          parent.components.set(this.key, this);
        } else {
          rootComponents.set(this.key, this);
        }

        const actionContext: RqActionContext<Props, Store> = {
          props: this.props,
          store: this.store,
          actions: {} as Record<string, (...args: any[]) => any>,
        };

        this.actions = bindActions(actions, actionContext);
        actionContext.actions = this.actions;

        let instances = componentInstances.get(this.name);
        if (!instances) {
          instances = new Map();
          componentInstances.set(this.name, instances);
        }
        instances.set(this.key, this);

        const cleanup = setup(this, this.props, this.store, this.actions);
        if (cleanup) {
          this.#cleanups.add(cleanup);
        }
        this.mounted = true;
        this.#resolveMounted();
      }

      disconnectedCallback() {
        this.dispose();
        this.mounted = false;

        this.#mountedPromise = new Promise(
          (resolve) => (this.#resolveMounted = resolve)
        );
        this.#parentMountedPromise = new Promise(
          (resolve) => (this.#resolveParentMounted = resolve)
        );
      }

      get parent(): RqComponent | undefined {
        return this.#parent;
      }

      get components(): Map<string, RqComponent> {
        return this.#components;
      }

      get elements() {
        return this.#elements;
      }

      query(name: string): RqElement {
        const existingEl = this.#elements.get(name);
        if (existingEl) {
          return existingEl;
        }

        const node = this.querySelector(`[rq="${name}"]`) as RqNode;
        const element = el(name, this, node);
        this.#elements.set(name, element);
        this.#cleanups.add(() => element.dispose());

        return element;
      }

      on(event: string, handler: (detail?: any) => void): () => void {
        const listener = (e: CustomEvent) => handler(e.detail);
        this.addEventListener(event, listener as EventListener);
        return () => {
          this.removeEventListener(event, listener as EventListener);
        };
      }

      dispose(): void {
        this.#components.forEach((child) => child.dispose());
        this.#components.clear();

        this.#elements.forEach((element) => element.dispose());
        this.#elements.clear();

        this.#cleanups.forEach((cleanup) => {
          try {
            cleanup();
          } catch (e) {
            console.error("Error in cleanup for component:", this.name, e);
          }
        });
        this.#cleanups.clear();

        if (this.#parent) {
          this.#parent.components.delete(this.key);
          this.#parent = undefined;
        }

        const instances = componentInstances.get(this.name);
        instances?.delete(this.key);
        if (instances?.size === 0) {
          componentInstances.delete(this.name);
        }
      }

      emit(event: string, detail?: any): void {
        const customEvent = new CustomEvent(event, {
          detail,
          bubbles: true,
          composed: true,
        });
        this.dispatchEvent(customEvent);
      }

      onParentMounted(): Promise<void> {
        return this.#parentMountedPromise;
      }

      onMounted(): Promise<void> {
        return this.#mountedPromise;
      }
    }

    customElements.define(name, ComponentElement);
  }
}
