<script lang="ts">
	import FilterableSetsGrid from '$lib/FilterableSetsGrid.svelte';
	import GlobalTranspositionButtons from '$lib/GlobalTranspositionButtons.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.folder.name}</title>
</svelte:head>

<h1>{data.folder.name}</h1>
<p>
	Here's an overview of all the sets and tunes in your folder. You can get a quick reminder of how
	each tune starts on this page, and see notes about the sets if you've added them. You can filter
	by type of tune, or however you like to break up your folder into sections. Clicking the title of
	a set will show you all the dots for that set.
</p>

<h2>Global transposition options</h2>
<GlobalTranspositionButtons showClefSwitcher />

<div class="filterable-sets-grid">
	<FilterableSetsGrid folder={data.folder} tuneFont="sans-serif" />
</div>

<p>
	When a user interacts with a <code>ViewSet</code> component, some preferences are kept in localstorage.
	This means user preferences are remembered per browser without having to use any kind of database or
	syncing service. By default, we store the transposition of each tune in a set, and the zoom level for
	the set at each device orientation.
</p>

<p>
	The set previews shown above can have their width configured by setting the CSS custom property <code
		>--set-preview-width</code
	>.
</p>

<style lang="postcss">
	.filterable-sets-grid {
		@apply mx-auto;
	}
	p {
		@apply max-w-prose mx-auto text-lg my-4;
	}
	h1 {
		@apply mt-3;
	}
	h2 {
		@apply text-center;
	}
</style>
