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

<style>
	ul {
		padding: 2rem;
		margin: 0 auto;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1.5rem;
		list-style-type: none;
		text-align: center;
	}
	@media (min-width: 640px) {
		ul {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (min-width: 768px) {
		ul {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
	.buttons {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
		margin: 0 auto;
		max-width: 90vw;
	}
	input[type='checkbox'] {
		margin-right: 0.25rem;
	}
	h2 {
		text-align: center;
		margin-top: 1rem;
		margin-bottom: -0.75rem;
	}
	li {
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
	}
	label {
		user-select: none;
	}
</style>
