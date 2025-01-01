---
"requery-js": patch
---

Fix class binding to preserve static classes defined in HTML. Previously, binding a dynamic class would overwrite any static classes on the element. Now static classes are preserved and combined with dynamic classes.
