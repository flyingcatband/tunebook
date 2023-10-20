import type { LoadEvent } from '@sveltejs/kit';
import type { Folder } from './folder.json/+server';

export function load({ fetch }: LoadEvent): Promise<{ folder: Folder }> {
	return fetch('/folder.json')
		.then((res) => res.json())
		.then((folder) => ({
			folder: { ...folder, content: folder.content.map((c) => ({ ...c, visible: true })) }
		}));
}
