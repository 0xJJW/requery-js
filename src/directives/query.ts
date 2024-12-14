import { getElementContext } from "@/context";
import { attributeKey, el } from "@/element";
import { RqElement, RqNode } from "@/types";
import { nodeNotFoundWarning } from "@/utils";

export function _query(parentRef: RqElement, name: string): RqElement {
  const parentCtx = getElementContext(parentRef);
  const node = parentRef.node?.querySelector(
    `[${attributeKey}="${name}"]`
  ) as RqNode;

  if (!node) {
    nodeNotFoundWarning(name);
    return parentRef;
  }

  const element = el(name, parentCtx.component, node, parentRef);

  return element;
}
