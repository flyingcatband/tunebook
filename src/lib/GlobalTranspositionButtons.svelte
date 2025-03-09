<script lang="ts">
	import { keyedLocalStorage } from './keyedLocalStorage';

	export let globalTransposition = keyedLocalStorage('globalTransposition', 0);
</script>

<p class="mx-auto w-fit flex flex-wrap gap-2">
	<button onclick={() => ($globalTransposition = 2)}>Make the folder B♭</button>
	<button onclick={() => ($globalTransposition = 0)}>Make the folder C</button>
	<button onclick={() => ($globalTransposition = -3)}>Make the folder E♭</button>
</p>
