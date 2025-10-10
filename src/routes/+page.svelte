<script lang="ts">
	import { keyedLocalStorage } from '$lib';
	import FilterableSetsGrid from '$lib/FilterableSetsGrid.svelte';
	import GlobalTranspositionButtons from '$lib/GlobalTranspositionButtons.svelte';
	import type { Set } from '$lib/types/index.js';

	let { data } = $props();
	let coreTunesOnly = keyedLocalStorage('coreTunesOnly', false);
	let isSetVisible = (set: Set) => !$coreTunesOnly || set.tags.includes('core');

	function nukeLocalStorage() {
		localStorage.clear();
		location.reload();
	}
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

<button onclick={nukeLocalStorage}>
	Reset all user preferences (transpositions, zoom levels etc)
</button>
<h2>Global transposition options</h2>
<GlobalTranspositionButtons showClefSwitcher />

<div class="filterable-sets-grid">
	<FilterableSetsGrid folder={data.folder} tuneFont="sans-serif" {isSetVisible} hideSectionNames>
		{#if $coreTunesOnly}
			<button onclick={() => ($coreTunesOnly = false)}>Show all tunes</button>
		{:else}
			<button onclick={() => ($coreTunesOnly = true)}>Show only core tunes</button>
		{/if}
	</FilterableSetsGrid>
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

<style>
	p {
		max-width: 65ch;
		margin: 1rem auto 1.5rem;
		font-size: 1.125rem;
		line-height: 140%;
	}

	button {
		margin-inline: auto;
		margin-block: 0.5rem;
		display: block;
	}
</style>
