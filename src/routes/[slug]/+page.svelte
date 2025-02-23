<script lang="ts">
	import ViewSet from '$lib/ViewSet.svelte';
	let { data } = $props();
	let set = $derived(data.set);
</script>

<button class="z-20 fixed left-3 top-3" onclick={() => history.back()}>Back</button>
<ViewSet {set} folderName={data.folder.name} fontFamily="sans-serif" displayAbcFields="TNCRO">
	<h2>Extra notes</h2>
	{#if set.notes}
		<p style="font-style:italic">{set.notes}</p>
	{/if}
	<p>Extra notes for a set can be placed directly inside <code>&lt;ViewSet&gt;</code></p>
	<p>
		You can set the notes to appear beside the set by clicking "Show Controls" &rarr; "Notes
		beside". The width for this can be configured by setting the CSS custom property <code
			>--notes-width</code
		>.
	</p>
</ViewSet>

<style lang="postcss">
	p {
		@apply mt-2;
	}
	p:last-child {
		@apply mb-4;
	}
</style>
