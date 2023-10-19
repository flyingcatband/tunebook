<script>
	import ViewSet from "$lib/ViewSet.svelte";
	export let data;
	$: set = data.set;
</script>
<button on:click={() => history.back()}>Back</button>
<ViewSet {set} />