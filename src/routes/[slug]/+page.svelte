<script lang="ts">
	import ViewSet from '$lib/ViewSet.svelte';
	let { data } = $props();
	let set = $derived(data.set);
</script>

<button onclick={() => history.back()}>Back</button>
<ViewSet
	{set}
	folderName={data.folder.name}
	fontFamily="sans-serif"
	displayAbcFields="TNCRO"
	showClefSwitcher
>
	<h2>Extra notes</h2>
	{#if set.notes}
		<p class="notes">{set.notes}</p>
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
		margin-top: 0.5rem;
	}

	p:last-child {
		margin-bottom: 1rem;
	}

	button {
		position: fixed;
		z-index: 20;
		left: 0.75rem;
		top: 0.75rem;
	}
	p.notes {
		font-style: italic;
	}
</style>
