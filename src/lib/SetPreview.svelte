<script lang="ts">
	import Incipit from '$lib/Incipit.svelte';
	import type { Set } from '$lib/types/index.js';
	/** The path to where your sets pages will be */
	export let basePath = '/';
	/** The set to show in the preview */
	export let set: Set;
	/** Should the set-level text notes be displayed? */
	export let showNotes = true;
	/** The font family to use for text rendered as part of the ABC */
	export let tuneFont: string | undefined = undefined;
	/** A list of ABC headers to display, specified as a string (e.g. 'TCBN') */
	export let displayAbcFields: string | undefined = undefined;
	/** The element to use for the heading. Set to undefined to hide the heading. */
	export let headingTy: string | undefined = 'h2';
</script>

<a href={basePath + set.slug}>
	<div class="set-preview">
		{#if set.name != undefined && headingTy}
			<svelte:element this={headingTy}>{set.name}</svelte:element>
		{/if}
		{#if set.tags.length}
			<ul class="tag-list">
				{#each set.tags as tag}
					<li class="tag">{tag}</li>
				{/each}
			</ul>
		{/if}
		{#if showNotes && set.notes.length}
			{#each set.notes as n}<p>{n}</p>{/each}
		{/if}
		{#each set.content as tune}
			<Incipit abc={tune.abc} fontFamily={tuneFont} {displayAbcFields} />
		{/each}
	</div>
</a>

<style lang="postcss">
	.set-preview {
		@apply py-4 px-2;
		width: var(--set-preview-width, 20rem);
		@apply text-center;
		@apply box-border;
	}
	.tag-list {
		@apply flex gap-x-2 gap-y-1 justify-center;
	}
	.tag {
		@apply w-fit;
	}
</style>
