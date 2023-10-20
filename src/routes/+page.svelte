<script lang="ts">
	import Incipit from '$lib/Incipit.svelte';

	export let data;
	$: folder = data.folder;
	$: visibleSections = folder.content.filter((f) => f.visible == true);
	function resetFilters() {
		folder.content.forEach((f) => (f.visible = true));
		folder.content = folder.content;
	}
</script>

<h1>Welcome to Choonbook</h1>
<ul>
	{#each folder.content as section}
		<li><label><input bind:checked={section.visible} type="checkbox" />{section.name}</label></li>
	{/each}
	<li><button on:click={resetFilters}>Any type of tune</button></li>
</ul>

<div class="set-list">
	{#each visibleSections as section}
		{#each section.content as set}
			<div class="set-incipit">
				<h2><a href={set.slug}>{set.name}</a></h2>
				{#each set.content as tune}
					<Incipit abc={tune.abc} />
				{/each}
			</div>
		{/each}
	{/each}
</div>

<style lang="postcss">
	.set-incipit {
		@apply ring-1 rounded-md;
		@apply w-80 py-4 px-2;
		@apply text-center;
	}
	.set-list {
		@apply flex flex-wrap gap-6 justify-evenly;
		@apply max-w-6xl mx-auto;
	}

	button {
		@apply rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600;
	}
	ul {
		@apply p-2;
	}
	input[type='checkbox'] {
		@apply mr-1;
	}
	li {
		@apply my-2;
	}
</style>
