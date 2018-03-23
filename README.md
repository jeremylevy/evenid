# The EvenID APP

## FAQ

### Why we use `@media(max-width: (@screen-desktop - 1))` in less files?

`.container` class start at `992px` (ie: desktop design start AT `992px`),
given we use `max-width: 992px` here we need to deduct one to not display it on desktop.

### Why we use `target="somethingUnique"`?

`target="_blank"` will cause a new window to open every time the user clicks the link. 
Unless this is really what you want to happen (and it rarely is) consider using `target="somethingUnique"` so that the user only gets the one window opening, even if they click the link several times. 
It makes for a much nicer UX.

### Why we use `onunload=""` and `onbeforeunload=""` in oauth authorize layouts?

To make sure page will be not cached even if back button was pressed.
(See https://msdn.microsoft.com/en-US/library/dn265017(v=vs.85).aspx)