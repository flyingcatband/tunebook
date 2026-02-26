# Next/Previous Set Navigation in ViewSet

This guide explains how to enable keyboard and gesture navigation between sets in your tunebook.

## Requirements

### 1. Data Structure Requirements

Your `Set` objects must include `nextSlug` and `previousSlug` properties. These can be added using the `addNextPreviousSlugs` helper function:

```typescript
import { addNextPreviousSlugs } from '@flyingcatband/tunebook/server';

// After generating your folder
const folderWithNavigation = addNextPreviousSlugs(folder);
```

The `addNextPreviousSlugs` function automatically:

- Adds `nextSlug` and `previousSlug` to each set
- Links sets sequentially across section boundaries
- Wraps around (first set's previous → last set, last set's next → first set)

### 2. ViewSet Component Props

Pass the `nextSetHref` and `previousSetHref` props to the `<ViewSet>` component.

#### Single Tunebook (route: `/[slug]`)

**Without `resolve` (simpler, but not recommended):**

```svelte
<script lang="ts">
  import ViewSet from '@flyingcatband/tunebook';

  let { data } = $props();
  let set = $derived(data.set);
</script>

<ViewSet
  {set}
  nextSetHref="/{set.nextSlug}"
  previousSetHref="/{set.previousSlug}"
  {/* other props */}
>
```

**With `resolve` (recommended):**

```svelte
<script lang="ts">
  import { resolve } from '$app/paths';
  import ViewSet from '@flyingcatband/tunebook';

  let { data } = $props();
  let set = $derived(data.set);
</script>

<ViewSet
  {set}
  nextSetHref={resolve('/[slug]', { slug: set.nextSlug })}
  previousSetHref={resolve('/[slug]', { slug: set.previousSlug })}
  {/* other props */}
>
```

**Why use `resolve`?** The `resolve` function respects your SvelteKit configuration, particularly the [`base` path](https://kit.svelte.dev/docs/configuration#paths) if your app is deployed to a subdirectory (e.g., `https://example.com/my-tunebook/`). Without `resolve`, the hrefs would break in that scenario. It also provides type safety for your route parameters.

#### Multiple Tunebooks (route: `/[tunebook]/[slug]`)

**Without `resolve`:**

```svelte
<ViewSet
  {set}
  nextSetHref="/{tunebookSlug}/{set.nextSlug}"
  previousSetHref="/{tunebookSlug}/{set.previousSlug}"
  {/* other props */}
>
```

**With `resolve` (recommended):**

```svelte
<script lang="ts">
  import { resolve } from '$app/paths';
  import ViewSet from '@flyingcatband/tunebook';

  let { data } = $props();
  let set = $derived(data.set);
  let tunebookSlug = $derived(data.tunebook); // or however you access it
</script>

<ViewSet
  {set}
  nextSetHref={resolve('/[tunebook]/[slug]', {
    tunebook: tunebookSlug,
    slug: set.nextSlug
  })}
  previousSetHref={resolve('/[tunebook]/[slug]', {
    tunebook: tunebookSlug,
    slug: set.previousSlug
  })}
  {/* other props */}
>
```

**Note**: If your navigation needs to cross tunebook boundaries, you'll need to include `nextTunebookSlug` and `previousTunebookSlug` in your data structure alongside `nextSlug` and `previousSlug`.

### 3. Updating Navigation Buttons to Match

If you have manual navigation buttons in your page layout, you should update them to use `resolve` too for consistency:

```svelte
<nav>
	<a class="button" href="/">All sets</a>
	<a class="button" href={resolve('/[slug]', { slug: set.previousSlug })}>Previous set</a>
	<a class="button" href={resolve('/[slug]', { slug: set.nextSlug })}>Next set</a>
</nav>
```

This ensures consistency between the manual navigation buttons and the keyboard/gesture navigation handled by ViewSet.

### 4. User Control

The navigation between sets is controlled by a global setting that users can toggle:

- Stored in localStorage as `globalNavThruSets` (boolean)
- When enabled, keyboard navigation and swipe gestures will navigate to next/previous sets when reaching the end/beginning of the current set
- When disabled, navigation stops at page boundaries within the current set

The ViewSet component automatically manages this setting. If you want to provide a UI control for users to toggle it (outside of ViewSet), you can use:

```svelte
<script lang="ts">
	import { keyedLocalStorage } from '@flyingcatband/tunebook';

	let globalNavThruSets = keyedLocalStorage('globalNavThruSets', false);
</script>

<label>
	<input type="checkbox" bind:checked={$globalNavThruSets} />
	Navigate through sets with arrow keys
</label>
```

The `keyedLocalStorage` function returns a Svelte writable store that automatically syncs with localStorage, so you use it with the `$` prefix to get/set the value.

### 5. Supported Navigation Methods

When `globalNavThruSets` is enabled and the props are provided, users can navigate between sets using:

- **Keyboard**: Arrow keys (Left/Right/Up/Down), PageUp/PageDown at page boundaries
- **Touch**: Swipe gestures (left/right) at page boundaries
- **Buttons**: Manual click on next/previous page buttons at boundaries

## Summary Checklist

- [ ] Use `addNextPreviousSlugs()` to add navigation slugs to your folder data
- [ ] Pass `nextSetHref` and `previousSetHref` props to `<ViewSet>`
- [ ] Use SvelteKit's `resolve` function for proper routing (recommended)
- [ ] Update manual navigation buttons to use `resolve` too
- [ ] Users will control the feature via the global `globalNavThruSets` setting in localStorage

The feature works automatically once these requirements are met. No additional configuration is needed.
