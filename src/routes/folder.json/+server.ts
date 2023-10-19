import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { readdir, readFile } from 'fs/promises';
import slugify from 'slugify';

export const prerender = true;

export type Folder = {
	name: string;
	content: Section[];
};

type Section = {
	name: string;
	content: Set[];
};

export type Set = {
	name: string;
	slug: string;
	content: Tune[];
};

type Tune = {
	filename: string;
	slug: string;
	abc: string;
};

export async function GET({}: RequestEvent): Promise<Response> {
	const tex = await readFile('../cat-tunes/trip-hazard.tex');
	const folder: Folder = {
		name: 'Trip Hazard',
		content: []
	};

	let currentSection: Section | undefined = undefined;
	let currentSet: Set | undefined = undefined;

	for (const line of tex.toString().split('\n')) {
		const sectionName = line.match(/\\section\{(.*)\}/)?.[1];
		const subsectionName = line.match(/\\subsection\{(.*)\}/)?.[1];
		const abcFilename = line.match(/\\abcinput\{(.*)\}/)?.[1];
		if (sectionName) {
			currentSection = { name: replaceEscapes(sectionName), content: [] };
			folder.content.push(currentSection);
		}
		if (subsectionName) {
			currentSet = {
				name: replaceEscapes(subsectionName),
				content: [],
				slug: slugify(subsectionName.replaceAll('/', ' '), { strict: true })
			};
			assertExists(currentSection, 'currentSection').content.push(currentSet);
		}
		if (abcFilename) {
			const abc = (await readFile(`../cat-tunes/${abcFilename}.abc`)).toString();
			assertExists(currentSet, 'currentSet').content.push({ abc, filename: abcFilename, slug: slugify(abcFilename.replaceAll('/', ' '), { strict: true }) });
		}
	}
	return json(folder);
}

function replaceEscapes(input: string): string {
	return input.replaceAll('---', '\u2014');
}

function assertExists<T>(value: T | undefined, name: string): T {
	// TODO cope with tunes not in sets
	if (typeof value === 'undefined') {
		throw Error(`${name} does not exist, is your LaTeX in a sensible order`);
	} else {
		return value;
	}
}
