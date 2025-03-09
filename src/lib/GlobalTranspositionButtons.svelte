<script lang="ts">
	import type { Writable } from 'svelte/store';
	import { keyedLocalStorage } from './keyedLocalStorage';
	import type { Clef } from './types';

	interface Props {
		/** Should the clef switcher be shown? */
		showClefSwitcher?: boolean;
	}

	let { showClefSwitcher = false }: Props = $props();

	let globalTransposition = keyedLocalStorage('globalTransposition', 0);
	let globalClef: Writable<Clef> = keyedLocalStorage('globalClef', 'treble');

	function toggleClef() {
		globalClef.update((c) => (c === 'treble' ? 'bass' : 'treble'));
	}
</script>

<p class="mx-auto w-fit flex flex-wrap gap-2">
	<button onclick={() => ($globalTransposition = 2)}>Make the folder B♭</button>
	<button onclick={() => ($globalTransposition = 0)}>Make the folder C</button>
	<button onclick={() => ($globalTransposition = -3)}>Make the folder E♭</button>
	{#if showClefSwitcher}
		<button onclick={toggleClef}>
			{$globalClef === 'treble' ? 'Switch to bass clef' : 'Switch to treble clef'}
		</button>
	{/if}
</p>
