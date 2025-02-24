<script lang="ts">
	import FilterSets from '$lib/FilterSets.svelte';
	import SetPreview from '$lib/SetPreview.svelte';
	import type { Folder } from './types/index.js';

	interface Props {
		folder: Folder;
		tuneFont?: string | undefined;
		filtersTitle?: string | undefined;
		displayAbcFields?: string | undefined;
		showNotes?: boolean | undefined;
		basePath?: string | undefined;
	}

	let {
		folder,
		tuneFont = undefined,
		filtersTitle = undefined,
		displayAbcFields = undefined,
		showNotes = undefined,
		basePath = undefined
	}: Props = $props();
</script>

<FilterSets {folder} {filtersTitle}>
	{#snippet children({ visibleSections })}
		<div class="set-list">
			{#each visibleSections as section}
				{#each section.content as set}
					<SetPreview {set} {tuneFont} {displayAbcFields} {showNotes} {basePath} />
				{/each}
			{/each}
		</div>
	{/snippet}
</FilterSets>

<style lang="postcss">
	.set-list {
		@apply flex flex-wrap gap-6 justify-center m-4 mb-8;
	}
</style>
