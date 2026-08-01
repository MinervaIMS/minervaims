# Fix the navbar breakpoint regression

## What happened

The header collapses to the mobile burger menu at every width, even on a 1280px desktop. The desktop links exist in the markup but are never displayed.

Cause (confirmed): the last `/join` landing change added a custom screen `h-sm: { raw: '(max-height: 780px)' }` to `tailwind.config.ts`. Tailwind v3 refuses to generate the arbitrary `min-[...]` / `max-[...]` variants when the `screens` config contains object values. Compiling the config reports:

```text
warn - The `min-*` and `max-*` variants are not supported with a `screens` configuration containing objects.
```

The header relies entirely on those variants (`min-[880px]:flex`, `min-[880px]:hidden`, `max-[879px]:!grid-cols-[1fr_auto]`), so all of them silently vanished from the stylesheet — hence logo + burger only. Any other component using `min-[...]`/`max-[...]` is affected the same way.

## The fix

1. Remove the `h-sm` entry from `theme.extend.screens` in `tailwind.config.ts`, so `screens` is back to plain min-width strings and the arbitrary variants compile again.
2. Re-add `h-sm` as a plugin variant instead, keeping `h-sm:` usable on `/join` unchanged:

```ts
plugin(({ addVariant }) => {
  addVariant('h-sm', '@media (max-height: 780px)');
})
```

(added alongside the existing plugins in the same file).

## Verification

- Recompile and confirm the stylesheet contains `@media (min-width: 880px)` rules and the `max-[879px]` grid override.
- Load the homepage at 1280px: desktop nav links visible, burger hidden; at 800px: burger only.
- Check `/join` landing at a 780px-tall viewport still applies its short-viewport rules.
