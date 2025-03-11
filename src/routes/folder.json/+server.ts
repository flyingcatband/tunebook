import { json } from '@sveltejs/kit';
import { addNextPreviousSlugs, generateFolderFromLatex } from '$lib/server/folderGeneration.js';

export const prerender = true;

export function GET(): Promise<Response> {
	return generateFolderFromLatex('Demo folder', './data/folder.tex')
		.then(addNextPreviousSlugs)
		.then(json);
}
