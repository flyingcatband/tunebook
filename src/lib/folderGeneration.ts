import { readFile } from 'fs/promises';
import path from 'path';
import slugify from 'slugify';
import type { Folder, Section, Set } from '$lib/types/index.js';

export async function generateFolderFromLatex(
	folderName: string,
	latexPath: string
): Promise<Folder> {
	const tex = await readFile(latexPath);
	const rootDirectory = path.dirname(latexPath);
	const folder: Folder = {
		name: folderName,
		content: []
	};

	let currentSection: Section | undefined = undefined;
	let currentSet: Set | undefined = undefined;
	let lastSeen: null | 'section' | 'set' | 'tune' = null;

	for (const line of tex.toString().split('\n')) {
		const sectionName = line.match(/\\section\{(.*)\}/)?.[1];
		const subsectionName = line.match(/\\subsection\{(.*)\}/)?.[1];
		const abcFilename = line.match(/\\abcinput\{(.*)\}/)?.[1];
		if (sectionName) {
			currentSection = { name: replaceTexEscapes(sectionName), content: [] };
			lastSeen = 'section';
			folder.content.push(currentSection);
		}
		if (subsectionName) {
			currentSet = {
				name: replaceTexEscapes(subsectionName),
				content: [],
				notes: [],
				slug: slugify(subsectionName.replaceAll('/', ' '), { strict: true })
			};
			lastSeen = 'set';
			assertExists(currentSection, 'currentSection').content.push(currentSet);
		}
		if (abcFilename) {
			const abc = (await readFile(`${rootDirectory}/${abcFilename}.abc`)).toString();
			lastSeen = 'tune';
			assertExists(currentSet, 'currentSet').content.push({
				abc,
				filename: abcFilename,
				slug: slugify(abcFilename.replaceAll('/', ' '), { strict: true })
			});
		}

		if (!line.trim().startsWith('\\') && lastSeen == 'set') {
			assertExists(currentSet, 'currentSet').notes.push(line.replace('\\\\', ''));
		}
	}

	return folder;
}

function replaceTexEscapes(input: string): string {
	return input.replaceAll('---', '\u2014');
}

function assertExists<T>(value: T | undefined, name: string): T {
	// TODO cope with tunes not in sets (#18)
	if (typeof value === 'undefined') {
		throw Error(`${name} does not exist, is your LaTeX in a sensible order`);
	} else {
		return value;
	}
}
