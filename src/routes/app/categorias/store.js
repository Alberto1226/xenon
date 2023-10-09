
import {writable} from 'svelte/store';

export const actualizar = writable(false);


export const seleccionando_padre_nuevo = writable(false);

export const padre_nuevo = writable(null);
export const categoria_nuevo_nombre = writable('');


export const categoria_padre_maximo_selecto = writable(false);