import { writable, type Writable } from 'svelte/store';

export function keyedLocalStorage<T>(key: string, defaultValue: T): Writable<T> {
	const rawValue = localStorage.getItem(key);
	const currentValue = rawValue ? JSON.parse(rawValue) : defaultValue;
	const { subscribe, set, update } = writable(currentValue);

	subscribe((value) => localStorage.setItem(key, JSON.stringify(value)));

	return {
		subscribe,
		set,
		update
	};
}
