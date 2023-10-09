import { writable } from "svelte/store"

export const pedido = writable(null)
export const pedidos = writable([])
export const acciones = writable([])