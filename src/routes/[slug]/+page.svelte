<script>
	import ViewSet from '$lib/ViewSet.svelte';
	export let data;
	$: set = data.set;
</script>

<button class="z-10 fixed left-2" on:click={() => history.back()}>Back</button>
<ViewSet {set} />
