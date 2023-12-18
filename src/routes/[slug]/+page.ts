import type { PageLoadEvent } from './$types.js';
import type { Set } from '$lib/types/index.js';
import { error } from '@sveltejs/kit';

export async function load({ parent, params: { slug } }: PageLoadEvent): Promise<{ set: Set }> {
	const data = await parent();
	const set = data.folder.content
		.flatMap((section) => section.content)
		.find((set) => set.slug === slug);
	if (set) {
		return { set };
	} else {
		error(404, 'Set not found');
	}
}
