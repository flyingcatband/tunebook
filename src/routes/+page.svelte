<script lang="ts">
	import FilterableSetsGrid from '$lib/FilterableSetsGrid.svelte';

	export let data;
</script>

<svelte:head>
	<title>{data.folder.name}</title>
</svelte:head>

<h1>{data.folder.name}</h1>
<p class="max-w-prose mx-auto text-lg">
	Here's an overview of all the sets and tunes in your folder. You can get a quick reminder of how
	each tune starts on this page, and see notes about the sets if you've added them. You can filter
	by type of tune, or however you like to break up your folder into sections. Clicking the title of
	a set will show you all the dots for that set.
</p>
<div class="filterable-sets-grid">
	<FilterableSetsGrid folder={data.folder} tuneFont="sans-serif" />
</div>

<style lang="postcss">
	.filterable-sets-grid {
		@apply mx-auto;
	}
</style>
