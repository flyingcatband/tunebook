<script lang="ts">
	import Incipit from '$lib/Incipit.svelte';
	import type { Set } from '$lib/types/index.js';
	/** the path to where your sets pages will be */
	export let basePath = '/';
	export let set: Set;
	/** Should the set-level text notes be displayed? */
	export let showNotes = true;
	export let tuneFont: string | undefined = undefined;
</script>

<div class="set-preview">
	<h2><a href={basePath + set.slug}>{set.name}</a></h2>
	{#if showNotes && set.notes.length}
		{#each set.notes as n}<p>{n}</p>{/each}
	{/if}
	{#each set.content as tune}
		<Incipit abc={tune.abc} fontFamily={tuneFont} />
	{/each}
</div>

<style lang="postcss">
	.set-preview {
		@apply py-4 px-2;
		width: var(--set-preview-width, 20rem);
		@apply text-center;
		@apply box-border;
	}
</style>
