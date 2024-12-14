import { attributeKey } from "@/element";
import type { Reactive, Ref } from "@vue/reactivity";

export interface RqComponent<
  Props extends object = object,
  Store extends object = object,
  Actions extends RqActions<Props, Store> = RqActions<Props, Store>
> extends HTMLElement {
  key: string;
  name: string;
  props: Reactive<Props>;
  store: Reactive<Store>;
  actions: RqBoundActions<Actions>;
  mounted: boolean;
  get parent(): RqComponent | undefined;
  get components(): Map<string, RqComponent>;
  get elements(): Map<string, RqElement>;
  query: (name: string) => RqElement;
  on: (event: string, handler: (detail?: any) => void) => () => void;
  dispose: () => void;
  emit: (event: string, detail?: any) => void;
  onParentMounted(): Promise<void>;
  onMounted(): Promise<void>;
}

export interface RqEventListener {
  (el: RqElement, evt: Event): void;
}

export interface RqElement {
  get name(): string;
  get node(): RqNode | null;
  get parent(): RqElement | null;
  get elements(): Map<string, RqElement>;
  bind: (property: string, value: RqDirectiveCallback<any>) => RqElement;
  on: (eventName: string, handler: RqEventListener) => RqElement;
  html: (value: RqDirectiveCallback<string>) => RqElement;
  show: (value: RqDirectiveCallback<boolean>) => RqElement;
  text: (value: RqDirectiveCallback<any>) => RqElement;
  query: (name: string) => RqElement;
  if: (
    condition: RqIfDirectiveCallback<boolean>,
    setup?: (element: RqElement) => void
  ) => void;
  for: {
    <T extends object>(
      items: () => T[],
      setup: (element: RqElement, item: T) => void
    ): void;
    <T extends object>(
      items: () => T[],
      keyFn: (item: T) => any,
      setup: (element: RqElement, item: T) => void
    ): void;
  };
  dispose: () => void;
  onMounted: (cb: () => (() => void) | void) => RqElement;
}

export interface RqNode extends HTMLElement {
  [attributeKey]?: string;
  _class?: string;
}

export interface RqComponentOptions<
  Props extends object,
  Store extends object,
  Actions extends RqActions<Props, Store>
> {
  props?: Props;
  store?: Store;
  actions?: Actions;
  setup: (
    component: RqComponent<Props, Store, Actions>,
    props: Reactive<Props>,
    store: Reactive<Store>,
    actions: RqBoundActions<Actions>
  ) => (() => void) | void;
}

export interface RqEffectOptions<T> {
  element: RqElement;
  value: T | Ref<T> | RqDirectiveCallback<T>;
  onCleanup?: (currentValue: T | Ref<T> | RqDirectiveCallback<T>) => T;
  effect: (getter: () => T) => void;
}

export type RqDirectiveCallback<T> = (element: RqElement) => T;

export type RqIfDirectiveCallback<T> = () => T;

export interface RqActionContext<Props extends object, Store extends object> {
  props: Reactive<Props>;
  store: Reactive<Store>;
  actions: Record<string, (...args: any[]) => any>;
}

export type RqActionFunction<
  Props extends object,
  Store extends object,
  Args extends any[] = any[]
> = (context: RqActionContext<Props, Store>, ...args: Args) => void;

export type RqActions<Props extends object, Store extends object> = Record<
  string,
  RqActionFunction<Props, Store>
>;

export type RqBoundAction<T> = T extends (
  context: any,
  ...args: infer P
) => infer R
  ? (...args: P) => R
  : never;

export type RqBoundActions<A> = {
  [K in keyof A]: RqBoundAction<A[K]>;
};
