<script lang="ts">
	import FilterSets from '$lib/FilterSets.svelte';
	import SetPreview from '$lib/SetPreview.svelte';
	import type { Snippet } from 'svelte';
	import type { Folder, Set } from './types/index.js';

	interface Props {
		/** The folder to display sets from */
		folder: Folder;
		/** The font family to use for text rendered as part of the ABC */
		tuneFont?: string | undefined;
		/** The title to display above the filter checkboxes */
		filtersTitle?: string | undefined;
		/** A list of ABC headers to display, specified as a string (e.g. 'TCBN') */
		displayAbcFields?: string | undefined;
		/** Should the set-level text notes be displayed? */
		showNotes?: boolean | undefined;
		/** Should the set-level tags be displayed? */
		showTags?: boolean | undefined;
		/**
		 * The base path for the links to sets Set this if you have a base path
		 * for the site e.g. 'tunes/' if the tunebook is hosted at
		 * 'https://example.com/tunes/'
		 */
		basePath?: string | undefined;
		/** A function to determine if a set should be visible.
		 *
		 * This is additional filtering on top of the filter by section checkboxes
		 */
		isSetVisible?: (set: Set) => boolean;
		/** Additional controls to add before the list of sets */
		children?: Snippet;
	}

	let {
		folder,
		tuneFont = undefined,
		filtersTitle = undefined,
		displayAbcFields = undefined,
		showNotes = undefined,
		showTags = undefined,
		basePath = undefined,
		isSetVisible = () => true,
		children: myChildren = undefined
	}: Props = $props();
</script>

<FilterSets {folder} {filtersTitle}>
	{#snippet children({ visibleSections })}
		{@render myChildren?.()}
		<div class="set-list">
			{#each visibleSections as section}
				{#each section.content as set}
					{#if isSetVisible(set)}
						<SetPreview {set} {tuneFont} {displayAbcFields} {showNotes} {showTags} {basePath} />
					{/if}
				{/each}
			{/each}
		</div>
	{/snippet}
</FilterSets>

<style lang="postcss">
	.set-list {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		justify-content: center;
		margin: 1rem 0 2rem;
	}
</style>
