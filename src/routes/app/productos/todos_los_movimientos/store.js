import { writable } from "svelte/store"


export const evento_selecto = writable({
    id: "",
    fecha: "",
    folios: "",
    usuario: ""
})