import { writable, type Writable } from "svelte/store";

export function keyedLocalStorageInt(key: string, defaultValue: number): Writable<number> {
    const rawValue = localStorage.getItem(key);
    const currentValue = rawValue ? parseInt(rawValue) : defaultValue;
    const { subscribe, set, update } = writable(currentValue);

    subscribe((value) => localStorage.setItem(key, value.toString()));

    return {
        subscribe,
        set,
        update,
    }
}