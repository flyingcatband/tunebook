export interface Folder<S extends Set<Tune> = Set<Tune>> {
	name: string;
	content: Section<S>[];
}

export interface Section<S extends Set<Tune> = Set<Tune>> {
	name: string;
	content: S[];
}

export interface Set<T extends Tune = Tune> {
	name?: string;
	slug: string;
	notes: string[];
	content: T[];
	tags: string[];
}

export interface NextPreviousSlugs {
	nextSlug: string;
	previousSlug: string;
}

export interface Tune {
	filename: string;
	slug: string;
	abc: string;
}

export type Clef = 'treble' | 'bass';
