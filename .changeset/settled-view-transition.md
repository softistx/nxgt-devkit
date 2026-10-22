---
"@nxgt/playwright": patch
---

`settled(page)` waits for the active view transition (`document.activeViewTransition`, where the browser exposes it) before the document's animations: a transition started by React's `<ViewTransition>` or `document.startViewTransition` creates its `::view-transition-*` animations only once the new state is rendered, so `settled` used to resolve before them, and a screenshot showed the old and new content on top of each other. A transition that starts while it waits is awaited too, up to ten in a row; one whose update never resolves is awaited only until the browser aborts it.
