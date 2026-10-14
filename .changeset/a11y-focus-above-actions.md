---
'@nxgt/playwright': minor
---

`@nxgt/playwright/a11y`: `expectFocusAboveActions` and `expectFieldsAboveActions` check WCAG 2.4.11 (Focus Not Obscured), which axe does not: the focused control, and its field's error, end above the sticky form actions, and Tab through the form up to the submit keeps each control clear of the bar. Options `actions`, `field`, `until` and `limit`; the `a11y` fixture carries both as `focusAboveActions` and `fieldsAboveActions`.
