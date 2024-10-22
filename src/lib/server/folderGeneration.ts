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
		if (!line.trim().startsWith('%')) {
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
					slug: slugify(subsectionName.replaceAll('/', ' '), { strict: true }),
					tags: []
				};
				lastSeen = 'set';
				assertExists(currentSection, 'currentSection').content.push(currentSet);
			}
			if (abcFilename) {
				const abc = (await readFile(`${rootDirectory}/${abcFilename}.abc`)).toString();
				lastSeen = 'tune';
				const set = assertExists(currentSet, 'currentSet');
				set.content.push({
					abc,
					filename: abcFilename,
					slug: slugify(abcFilename.replaceAll('/', ' '), { strict: true })
				});
				addTagsFrom(abc, set.tags);
			}
			if (!line.trim().startsWith('\\') && lastSeen == 'set') {
				assertExists(currentSet, 'currentSet').notes.push(line.replace('\\\\', ''));
			}
		}
	}

	return folder;
}

function addTagsFrom(abc: string, tags: string[]) {
	for (const tag of extractTags(abc)) {
		if (!tags.includes(tag)) {
			tags.push(tag);
		}
	}
}

function extractTags(abc: string): string[] {
	const results = [];
	for (const match of abc.matchAll(/^G: *([\w, -]+) *$/gm)) {
		results.push(
			...match[1]
				.split(',')
				.filter((tag) => tag)
				.map((tag) => tag.trim())
		);
	}
	return results;
}

export async function generateFolderFromMultiSetAbcFile(
	folderName: string,
	abcPath: string
): Promise<Folder> {
	const abc = (await readFile(abcPath)).toString();
	return generateFolderFromMultiSetAbcString(folderName, abc);
}

async function generateFolderFromMultiSetAbcString(
	folderName: string,
	abc: string
): Promise<Folder> {
	const folder: Folder = {
		name: folderName,
		content: []
	};

	let sharedHeaders: string[] = [];
	let currentAbc = '';
	let globalKey = '';
	let setTitle: string | undefined = undefined;
	let currentSection: Section | undefined;
	let currentSet: Set | undefined = undefined;

	const pushCurrentTune = () => {
		if (!currentSet) throw Error('Not currently in a set');
		if (currentSet?.content.length === 0 && setTitle) {
			currentSet.content.push({
				filename: '',
				slug: slugify(setTitle, { strict: true }),
				abc: ''
			});
		}
		const abc = `X:1\n` + sharedHeaders.join('\n') + `\n` + globalKey + currentAbc;
		currentSet.content[currentSet?.content.length - 1].abc = abc;
		addTagsFrom(abc, currentSet.tags);
	};

	for (const line of abc.split('\n')) {
		if (line.match(/X: *[0-9]+/)) {
			if (currentAbc && setTitle) {
				pushCurrentTune();
			}
			setTitle = undefined;
			sharedHeaders = [];
		}

		const abcTitle = line.match(/T: *(.+)/)?.[1];
		if (setTitle == null && abcTitle) {
			setTitle = abcTitle;
			let sectionTitle = setTitle.match(/(.+) [1-9][0-9a-d]? +- /)?.[1];
			if (!sectionTitle) {
				sectionTitle = setTitle.match(/(.+) +- /)?.[1];
			}
			if (!sectionTitle) {
				throw new Error(`Couldn't infer section title from "${setTitle}"`);
			}
			if (currentSection?.name != sectionTitle) {
				folder.content.push({
					name: sectionTitle,
					content: []
				});

				currentSection = folder.content[folder.content.length - 1];
			}
			currentSection.content.push({
				name: abcTitle,
				slug: slugify(abcTitle, { strict: true }),
				notes: [],
				content: [],
				tags: []
			});
			currentSet = currentSection.content[currentSection.content.length - 1];
			currentAbc = '';
		} else if (abcTitle) {
			if (!currentSet) throw Error('Not currently in a set');
			if (currentSet.content.length > 0) {
				pushCurrentTune();
			}
			currentAbc = '';
			currentSet.content.push({
				filename: '',
				slug: slugify(abcTitle, { strict: true }),
				abc: ''
			});
		}

		const setComment = line.match(/%%text +(.*)/)?.[1].trim();
		if (setComment && currentSet?.content.length == 0) {
			currentSet?.notes.push(setComment);
		}

		if (currentSet?.content.length == 0) {
			if (line.match(/[LMRG]:.*/)) {
				sharedHeaders.push(line);
			}
			if (line.match(/K:.*/)) {
				globalKey = `${line}\n`;
			}
		} else if (!line.match(/P: *[A-Z]/) && line.trim()) {
			currentAbc += line;
			currentAbc += '\n';
			if (line.match(/K:.*/)) {
				globalKey = '';
			}
		}
	}

	pushCurrentTune();

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

if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;

	describe('extractTags', () => {
		const sut = extractTags;
		it('returns no tags when no G fields are present', () => {
			const abc = `X:1\nT:A set\n%...`;
			expect(sut(abc)).toEqual([]);
		});

		it('pulls out single tag', () => {
			const abc = `X:1\nG: test\nT:A set\n%...`;
			expect(sut(abc)).toEqual(['test']);
		});

		it('pulls out comma-separated tag', () => {
			const abc = `X:1\nG: test,test2\nT:A set\n%...`;
			expect(sut(abc)).toEqual(['test', 'test2']);
		});

		it('trims comma-separated tags', () => {
			const abc = `X:1\nG:   test   ,  test2   \nT:A set\n%...`;
			expect(sut(abc)).toEqual(['test', 'test2']);
		});

		it('pulls out tags in multiple G fields', () => {
			const abc = `X:1\nG: test\nG: test2\nT:A set\n%...`;
			expect(sut(abc)).toEqual(['test', 'test2']);
		});

		it('pulls out tag with no leading space', () => {
			const abc = `X:1\nG:test\nT:A set\n%...`;
			expect(sut(abc)).toEqual(['test']);
		});

		it('ignores tune lines', () => {
			const abc = `X:1\nT:A set\nABcd|ef\nG:|`;
			expect(sut(abc)).toEqual([]);
		});
	});

	describe('addTagsFrom', () => {
		const sut = (abc: string, tags: string[]): string[] => {
			addTagsFrom(abc, tags);
			return tags;
		};

		it('adds all tags if none are currently set', () => {
			expect(sut(`X:1\nG:tag1,tag2\nT:A tune`, [])).toEqual(['tag1', 'tag2']);
		});

		it('does not add tags if they are already set', () => {
			expect(sut(`X:1\nG:tag\nT:A tune`, ['tag'])).toEqual(['tag']);
		});
	});

	describe('generateFolderFromMultiSetAbcString', () => {
		const sut = generateFolderFromMultiSetAbcString;

		it('extracts tags from set-level headers', async () => {
			const abc = `X:1\nT:Jigs 1 - Som jigs\nG:Show set\nP:A\nT:A tune\n% ...\nabcdef\nX:2`;

			const folder = await sut('Test folder', abc);

			expect(folder.content[0].content[0].tags).toEqual(['Show set']);
		});

		it('applies global key to first tune', async () => {
			const abc = `X:1\nT:Jigs 1 - Som jigs\nK:G\nP:A\nT:A tune\n% ...\nabcdef\nX:2`;

			const folder = await sut('Test folder', abc);

			expect(folder.content[0].content[0].content[0].abc).toContain('K:G');
		});

		it('applies tune-specific key to first tune', async () => {
			const abc = `X:1\nT:Jigs 1 - Som jigs\nP:A\nT:A tune\nK:G\n% ...\nabcdef\nX:2`;

			const folder = await sut('Test folder', abc);

			expect(folder.content[0].content[0].content[0].abc).toContain('K:G');
		});

		it('does not override tune specific key with global key', async () => {
			const abc = `X:1\nT:Jigs 1 - Som jigs\nK:G\nP:A\nT:A tune\nK:A\n% ...\nabcdef\nX:2`;

			const folder = await sut('Test folder', abc);

			expect(folder.content[0].content[0].content[0].abc).not.toContain('K:G');
		});

		it('extracts tags from tune-level headers', async () => {
			const abc = `X:1\nT:Jigs 1 - Som jigs\nP:A\nT:A tune\nG:English\n% ...\nabcdef\nX:2`;

			const folder = await sut('Test folder', abc);

			expect(folder.content[0].content[0].tags).toEqual(['English']);
		});
	});
}
