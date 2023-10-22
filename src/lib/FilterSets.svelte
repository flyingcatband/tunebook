<script lang="ts">
	import type { Section } from '$lib/types/index.js';

	export let folder: { name: string; content: (Section & { visible?: boolean })[] };
	resetFilters();
	let visibleSections = folder.content;
	$: visibleSections = folder.content.filter((f) => f.visible);
	function resetFilters() {
		if (!folder) return;
		folder.content.forEach((f) => (f.visible = true));
		folder.content = folder.content;
	}
</script>

<h2>Filter sets</h2>
<ul>
	{#each folder.content as section}
		<li><label><input bind:checked={section.visible} type="checkbox" />{section.name}</label></li>
	{/each}
	<li><button on:click={resetFilters}>Any type of tune</button></li>
</ul>

<slot {visibleSections} />

<style lang="postcss">
	ul {
		@apply p-2 w-fit mx-auto block;
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
