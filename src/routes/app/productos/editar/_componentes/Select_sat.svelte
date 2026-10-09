<script>
  import { postData } from "./../../../../stores";

  // Campo que guarda solo la clave; la lista desplegable muestra "clave - descripción".
  export let valor = "";
  export let catalogo = "producto";
  export let placeholder = "";
  export let maxlength = 60;

  let abierto = false;
  let opciones = [];
  let temporizador;

  // Solo se usa la respuesta de la última búsqueda; las anteriores pueden llegar tarde y pisar el filtro.
  let ultima_busqueda = 0;

  async function buscar(texto) {
    const numero = ++ultima_busqueda;
    const q = texto == null ? "" : String(texto);
    try {
      const r = await postData("/app/catalogos_sat/buscar", { catalogo, q });
      if (numero !== ultima_busqueda) return;
      opciones = r && r.ok ? r.resultados : [];
    } catch (err) {
      if (numero === ultima_busqueda) opciones = [];
    }
  }

  function al_escribir(evento) {
    const texto = evento.target.value;
    valor = texto;
    abierto = true;
    clearTimeout(temporizador);
    // El texto se toma del input y se pasa directo; no depende del estado del componente.
    temporizador = setTimeout(() => buscar(texto), 250);
  }

  function al_enfocar(evento) {
    abierto = true;
    buscar(evento.target.value);
  }

  let campo;

  function elegir(opcion) {
    clearTimeout(temporizador);
    ultima_busqueda++;
    valor = opcion.clave;
    // Se escribe también directo en el input para no depender de la actualización del enlace con el formulario.
    if (campo) campo.value = opcion.clave;
    abierto = false;
  }

  function al_salir() {
    setTimeout(() => (abierto = false), 150);
  }
</script>

<div class="select_sat">
  <input
    bind:this={campo}
    value={valor == null ? "" : valor}
    {maxlength}
    {placeholder}
    autocomplete="off"
    on:input={al_escribir}
    on:keyup={al_escribir}
    on:focus={al_enfocar}
    on:blur={al_salir}
  />
  {#if abierto && opciones.length > 0}
    <ul>
      {#each opciones as opcion}
        <li on:mousedown|preventDefault={() => elegir(opcion)}>
          <strong>{opcion.clave}</strong> - {opcion.descripcion}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .select_sat { position: relative; max-width: 420px; }
  input { width: 100%; box-sizing: border-box; min-height: 36px; padding: 6px 8px; }
  ul {
    position: absolute; z-index: 20; left: 0; right: 0; margin: 2px 0 0; padding: 0;
    list-style: none; max-height: 240px; overflow-y: auto;
    background: #fff; border: 1px solid #cbd5e1; border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  li { padding: 6px 10px; cursor: pointer; font-size: 13px; }
  li:hover { background: #e0e7ff; }
</style>
