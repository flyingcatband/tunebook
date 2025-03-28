<script lang="ts">
	import { BROWSER } from 'esm-env';
	import pkg from 'abcjs';
	const { renderAbc } = pkg;
	import { writable, type Writable } from 'svelte/store';
	import { tick, untrack } from 'svelte';
	let dots: HTMLDivElement | undefined = $state();
	interface Props {
		/** The number of semitones to transpose all tunes by
		 *
		 * For example, to make a Bb folder, set this to 2
		 * and to make a Eb folder, set this to -3
		 */
		globalTransposition?: number;
		/** The number of semitones to transpose this tune by */
		tuneOffset: Writable<number>;
		/** The ABC for the tune you want to display */
		abc: string;
		/** The font family to use for text rendered as part of the ABC */
		fontFamily?: string | undefined;
		staffwidth?: number | undefined;
		tunesContainer?: Element | undefined;
		fontSize?: number;
		titleSize?: number;
		visible?: boolean;
		showTransposition?: boolean;
		refreshVisibility?: any;
		onrerenderedAbc?: () => void;
	}

	let {
		globalTransposition = 0,
		tuneOffset,
		abc,
		fontFamily = undefined,
		staffwidth = undefined,
		tunesContainer = undefined,
		fontSize = 12,
		titleSize = fontSize + 6,
		visible = $bindable(),
		showTransposition = true,
		refreshVisibility = writable(0),
		onrerenderedAbc
	}: Props = $props();

	let svg: SVGElement | undefined = $state(undefined);
	async function updateSvg() {
		await tick();
		onrerenderedAbc?.();
		svg = dots?.getElementsByTagName('svg')?.[0];
		if (typeof fontFamily !== 'undefined') {
			let fontStr = fontFamily;
			svg?.querySelectorAll('g[data-name=ending] text').forEach((elem) => {
				elem.setAttribute('font-family', fontStr);
			});
		}
	}

	let innerHeight = $state(0);
	let innerWidth = $state(0);

	function _updateVisible(
		boundingRect: DOMRect | undefined,
		_: number,
		innerHeight: number,
		innerWidth: number
	) {
		if (!boundingRect?.height) {
			visible = false;
		} else {
			const containingRect = tunesContainer?.getBoundingClientRect() || {
				bottom: innerHeight,
				right: innerWidth
			};
			visible =
				boundingRect.bottom <= containingRect.bottom && boundingRect.right <= containingRect.right;
		}
	}
	// Normalize repeats to start at the beginning of a line rather than the end of the previous line
	// abcjs displays repeats where written in the abc, so it looks weird if we don't do this
	let amendedAbc = $derived(abc.replace(/\|: *\n/g, '||\n|:').replace(/::.*\n/g, ':|\n|:'));
	let tuneOffsetMagnitude = $derived((($tuneOffset % 12) + 12) % 12);
	let transposeName = $derived(
		globalTransposition === 0
			? tuneOffsetMagnitude === 2
				? '(for B♭ instruments)'
				: tuneOffsetMagnitude === 9
					? '(for E♭ instruments)'
					: ''
			: ''
	);
	let transpose_summary = $derived(
		`Transposed ${$tuneOffset > 0 ? '+' : ''}${$tuneOffset} ${transposeName}`.trim()
	);
	let moreAmendedAbc = $derived(
		showTransposition && $tuneOffset !== 0
			? amendedAbc.replace(
					/\n(T:[^\n]*)\n/,
					(match, mainTitle) => `\n${mainTitle}\nT: ${transpose_summary}\n`
				)
			: amendedAbc
	);
	$effect.pre(() => {
		if (dots && BROWSER) {
			renderAbc(dots, moreAmendedAbc, {
				format: fontFamily
					? {
							titlefont: `${fontFamily} Bold ${titleSize}`,
							subtitlefont: `${fontFamily} ${fontSize}`,
							composerfont: `${fontFamily} ${fontSize}`,
							historyfont: `${fontFamily} ${fontSize}`,
							partsfont: `${fontFamily} ${fontSize}`,
							tempofont: `${fontFamily} ${fontSize}`,
							infofont: `${fontFamily} ${fontSize}`,
							gchordfont: `${fontFamily} ${fontSize}`,
							annotationfont: `${fontFamily} ${fontSize}`,
							textfont: `${fontFamily} ${fontSize}`,
							vocalfont: `${fontFamily} ${fontSize}`,
							wordsfont: `${fontFamily} ${fontSize}`
						}
					: {},
				visualTranspose: globalTransposition + $tuneOffset,
				selectTypes: false,
				responsive: 'resize',
				// This makes typescript happy that staffwidth is not undefined
				// If staffwidth is defined, add it as a property, else splat {} to avoid adding staffwidth
				...((staffwidth && { staffwidth }) || {})
			});
			untrack(updateSvg);
		}
	});
	$effect.pre(() => {
		_updateVisible(svg?.getBoundingClientRect(), $refreshVisibility, innerHeight, innerWidth);
		tick().then(() => {
			_updateVisible(svg?.getBoundingClientRect(), $refreshVisibility, innerHeight, innerWidth);
		});
	});
</script>

<svelte:window bind:innerHeight bind:innerWidth />

<div bind:this={dots}></div>

<style>
	div :global(svg) {
		width: 100%;
	}

	div {
		width: max-content;
		margin-inline: auto;
		user-select: none;
	}
</style>
