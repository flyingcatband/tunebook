<script lang="ts">
	import type { Folder } from '$lib/types/index.js';
	import { keyedLocalStorage } from './keyedLocalStorage';

	interface Props {
		/** The folder to display sets from */
		folder: Folder;
		/** The title to display above the filter checkboxes */
		filtersTitle?: string;
		children?: import('svelte').Snippet<[any]>;
	}

	let { folder, filtersTitle = 'Filter sets', children }: Props = $props();
	let visible = keyedLocalStorage(
		`visibleSets-${folder.name}`,
		Object.fromEntries(folder.content.map((f) => [f.name, true]))
	);
	if (folder.content.every((f) => !$visible[f.name])) {
		resetFilters();
	}
	folder.content.forEach((f) => {
		if ($visible[f.name] === undefined) {
			$visible[f.name] = true;
		}
	});
	let visibleSections = $state(folder.content);
	$effect.pre(() => {
		visibleSections = folder.content.filter((f) => $visible[f.name]);
	});
	function resetFilters() {
		folder.content.forEach((f) => ($visible[f.name] = true));
	}
	function unsetFilters() {
		folder.content.forEach((f) => ($visible[f.name] = false));
	}
</script>

<h2>{filtersTitle}</h2>
<ul>
	{#each folder.content as section}
		<li>
			<label><input bind:checked={$visible[section.name]} type="checkbox" />{section.name}</label>
		</li>
	{/each}
</ul>
<div class="buttons">
	<button onclick={unsetFilters}>None of the tune types</button>
	<button onclick={resetFilters}>Any type of tune</button>
</div>

{@render children?.({ visibleSections })}

<style lang="postcss">
	ul {
		@apply p-2 mx-auto;
		display: grid;
		@apply grid-cols-2 sm:grid-cols-3 md:grid-cols-4 grid-flow-row w-fit gap-x-6;
	}
	.buttons {
		@apply flex gap-2 flex-wrap mx-auto max-w-[90vw] justify-center;
	}
	input[type='checkbox'] {
		@apply mr-1;
	}
	h2 {
		@apply text-center mt-4 -mb-3;
	}
	li {
		@apply my-2;
	}
	label {
		user-select: none;
	}
</style>
