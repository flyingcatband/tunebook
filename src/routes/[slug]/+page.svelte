<script>
	import ViewSet from '$lib/ViewSet.svelte';
	export let data;
	$: set = data.set;
</script>

<button class="z-10 fixed left-2" on:click={() => history.back()}>Back</button>
<ViewSet {set} folderName={data.folder.name} fontFamily="sans-serif">
	<h2>Extra notes</h2>
	<p>Extra notes for a set can be placed directly inside <code>&lt;ViewSet&gt;</code></p>
	{#if set.notes}
		<p>{set.notes}</p>
	{/if}
</ViewSet>
