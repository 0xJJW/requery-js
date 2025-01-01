---
"requery-js": patch
---

Export RqActionContext and RqActions types to enable proper typing for component actions:

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
