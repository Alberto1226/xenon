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
  let buscando = false;
  let descripcion_seleccionada = "";
  let campo;

  // Solo se usa la respuesta de la última búsqueda; las anteriores pueden llegar tarde y pisar el filtro.
  let ultima_busqueda = 0;

  // Mantener el campo de texto sincronizado con el prop valor si cambia desde el padre
  $: if (campo && valor != null && campo.value !== valor) {
    campo.value = valor;
  }

  // Resolver la descripción legible cuando ya hay una clave guardada en el producto
  let clave_resuelta = "";
  $: if (valor && valor !== clave_resuelta && !descripcion_seleccionada) {
    clave_resuelta = valor;
    resolver_descripcion(valor);
  }

  async function resolver_descripcion(codigo) {
    if (!codigo) return;
    try {
      const r = await postData("/app/catalogos_sat/buscar", { catalogo, q: codigo });
      if (r && r.ok && r.resultados && r.resultados.length > 0) {
        const exacto = r.resultados.find(
          x => String(x.clave).toUpperCase() === String(codigo).toUpperCase()
        );
        if (exacto) {
          descripcion_seleccionada = exacto.descripcion;
        } else if (r.resultados[0]) {
          descripcion_seleccionada = r.resultados[0].descripcion;
        }
      }
    } catch (e) {}
  }

  async function buscar(texto) {
    const numero = ++ultima_busqueda;
    const q = texto == null ? "" : String(texto).trim();
    if (!q) {
      opciones = [];
      buscando = false;
      return;
    }
    buscando = true;
    try {
      const r = await postData("/app/catalogos_sat/buscar", { catalogo, q });
      if (numero !== ultima_busqueda) return;
      opciones = r && r.ok ? r.resultados : [];
    } catch (err) {
      if (numero === ultima_busqueda) opciones = [];
    } finally {
      if (numero === ultima_busqueda) buscando = false;
    }
  }

  function al_escribir(evento) {
    const texto = evento.target.value;
    valor = texto;
    descripcion_seleccionada = "";
    abierto = true;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => buscar(texto), 220);
  }

  function al_enfocar(evento) {
    abierto = true;
    if (evento.target.value) {
      buscar(evento.target.value);
    }
  }

  function elegir(opcion) {
    clearTimeout(temporizador);
    ultima_busqueda++;
    valor = opcion.clave;
    descripcion_seleccionada = opcion.descripcion;
    clave_resuelta = opcion.clave;
    if (campo) campo.value = opcion.clave;
    abierto = false;
    opciones = [];
  }

  function al_salir() {
    setTimeout(() => (abierto = false), 200);
  }
</script>

<div class="select_sat">
  <div class="input_wrapper">
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
    {#if buscando}
      <span class="icono_cargando">...</span>
    {/if}
  </div>

  {#if descripcion_seleccionada}
    <div class="desc_seleccionada" title={descripcion_seleccionada}>
      <span class="check_icon">✓</span>
      <span class="desc_texto">{descripcion_seleccionada}</span>
    </div>
  {/if}

  {#if abierto && (opciones.length > 0 || buscando)}
    <ul>
      {#if buscando && opciones.length === 0}
        <li class="info_item">Consultando API SAT...</li>
      {:else}
        {#each opciones as opcion}
          <li on:mousedown|preventDefault={() => elegir(opcion)}>
            <strong class="clave_badge">{opcion.clave}</strong>
            <span class="desc_opcion">{opcion.descripcion}</span>
          </li>
        {/each}
      {/if}
    </ul>
  {/if}
</div>

<style>
  .select_sat {
    position: relative;
    width: 100%;
  }
  .input_wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }
  input {
    width: 100%;
    box-sizing: border-box;
    min-height: 42px;
    padding: 8px 12px;
    background: #ffffff;
    color: #1e293b;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 13.5px;
    transition: all 0.2s ease;
  }
  input:focus {
    outline: none;
    border-color: #0284c7;
    box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
    background: #ffffff;
  }
  .icono_cargando {
    position: absolute;
    right: 12px;
    color: #0284c7;
    font-size: 13px;
    letter-spacing: 2px;
    font-weight: bold;
  }
  .desc_seleccionada {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    padding: 4px 10px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 4px;
    font-size: 12px;
    color: #15803d;
  }
  .check_icon {
    font-weight: bold;
    color: #16a34a;
  }
  .desc_texto {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  ul {
    position: absolute;
    z-index: 100;
    left: 0;
    right: 0;
    margin: 4px 0 0;
    padding: 4px 0;
    list-style: none;
    max-height: 240px;
    overflow-y: auto;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
  }
  li {
    padding: 9px 12px;
    cursor: pointer;
    font-size: 13px;
    color: #334155;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid #f1f5f9;
    transition: background-color 0.15s;
  }
  li:last-child {
    border-bottom: none;
  }
  li:hover {
    background-color: #f0f9ff;
    color: #0369a1;
  }
  .clave_badge {
    color: #0369a1;
    background: #e0f2fe;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 11px;
    font-family: monospace;
    font-weight: 700;
    flex-shrink: 0;
  }
  .desc_opcion {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-grow: 1;
  }
  .info_item {
    color: #64748b;
    font-style: italic;
    justify-content: center;
  }
</style>
