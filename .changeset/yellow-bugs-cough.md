---
"requery-js": minor
---

BREAKING CHANGE: Event handlers now receive a single enhanced event parameter instead of separate element and event parameters:

```typescript
// Before
component.query("button").on("click", (el, evt) => {
  console.log("el", el);
  console.log("evt", evt);
});

// After
component.query("button").on("click", (evt) => {
  // The RqElement is now available on the event object
  console.log("el", evt.element);
});
```

This change:
- Simplifies the event handler API
- Better aligns with standard DOM event patterns
- Maintains access to requery-js element functionality via event.element

Migration required: Update all event handlers to use the new single parameter pattern.
