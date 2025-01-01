# requery-js

## 0.1.4

### Patch Changes

- 565a8a5: Export RqActionContext and RqActions types to enable proper typing for component actions:

  ```typescript
  import type {
    RqActionContext,
    RqActions
  } from 'requery-js'

  interface Props {
    foo: string;
  }

  interface Store {
    bar: string;
  }

  interface Actions
    extends RqActions<Props, Store> {
    log(
      ctx: RqActionContext<Props, Store>,
    ): void;
  }

  defineComponent<Props, Store, Actions>("rq-example", {
    ...
  });
  ```

- e7e6198: Fix class binding to preserve static classes defined in HTML. Previously, binding a dynamic class would overwrite any static classes on the element. Now static classes are preserved and combined with dynamic classes.

## 0.1.3

### Patch Changes

- 2bf8c0c: fix: add missing function declarations to type definitions

## 0.1.2

### Patch Changes

- d04d911: docs: add cdn installation instructions to README.md

## 0.1.1

### Patch Changes

- d1c9b23: docs: add npm installation instructions to README.md

## 0.1.0

### Minor Changes

- 4fd45a2: First release of requery-js 🎉

  Note: This is a pre-1.0 release and the API should be considered unstable
