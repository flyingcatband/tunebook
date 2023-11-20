<script lang="ts">
	import type { Section } from '$lib/types/index.js';

	export let folder: { name: string; content: (Section & { visible?: boolean })[] };
	export let filtersTitle = 'Filter sets';
	resetFilters();
	let visibleSections = folder.content;
	$: visibleSections = folder.content.filter((f) => f.visible);
	function resetFilters() {
		if (!folder) return;
		folder.content.forEach((f) => (f.visible = true));
		folder.content = folder.content;
	}
	function unsetFilters() {
		if (!folder) return;
		folder.content.forEach((f) => (f.visible = false));
		folder.content = folder.content;
	}
</script>

<h2>{filtersTitle}</h2>
<ul>
	{#each folder.content as section}
		<li><label><input bind:checked={section.visible} type="checkbox" />{section.name}</label></li>
	{/each}
</ul>
<div class="buttons">
	<button on:click={unsetFilters}>None of the tune types</button><button on:click={resetFilters}
		>Any type of tune</button
	>
</div>

<slot {visibleSections} />

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
