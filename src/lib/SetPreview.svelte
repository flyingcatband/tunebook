<script lang="ts">
	import Incipit from '$lib/Incipit.svelte';
	import type { Set } from '$lib/types/index.js';

	export let set: Set;
    export let tuneFont: string | undefined = undefined;
</script>

<div class="set-preview">
	<h2><a href={set.slug}>{set.name}</a></h2>
	{#if set.notes.length}
		{#each set.notes as n}<p>{n}</p>{/each}
	{/if}
	{#each set.content as tune}
		<Incipit abc={tune.abc} fontFamily={tuneFont} />
	{/each}
</div>

<style lang="postcss">
	.set-preview {
		@apply w-80 py-4 px-2;
		@apply text-center;
        @apply box-border;
	}
</style>
