<script lang="ts">
	import FilterableSetsGrid from '$lib/FilterableSetsGrid.svelte';

	export let data;
</script>

<svelte:head>
	<title>{data.folder.name}</title>
</svelte:head>

<h1>{data.folder.name}</h1>
<div class="filterable-sets-grid">
<FilterableSetsGrid folder={data.folder} tuneFont="Saira Condensed" />
</div>

<style lang="postcss">
    .filterable-sets-grid {
        @apply mx-auto;
    }
</style>
