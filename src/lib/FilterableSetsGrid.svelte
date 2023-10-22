<script lang="ts">
	import FilterSets from '$lib/FilterSets.svelte';
	import SetPreview from '$lib/SetPreview.svelte';
	import type { Folder } from './types/index.js';

	export let folder: Folder;
	export let tuneFont: string | undefined = undefined;
</script>

<FilterSets {folder} let:visibleSections>
	<div class="set-list">
		{#each visibleSections as section}
			{#each section.content as set}
				<SetPreview {set} {tuneFont} />
			{/each}
		{/each}
	</div>
</FilterSets>

<style lang="postcss">
	.set-list {
		@apply flex flex-wrap gap-6 justify-center m-4 mb-8;
	}
</style>
