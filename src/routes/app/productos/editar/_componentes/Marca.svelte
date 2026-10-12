<script>
  import { postData } from "./../../../../stores";
  import { onMount } from "svelte";

  export var marca = "";

  let marcas = [];
  let lista = [];
  let busqueda = "";
  let abierto = false;
  let modo_personalizado = false;
  let input_busqueda;

  onMount(() => {
    getColeccion();
  });

  function getColeccion() {
    return postData("app/productos/catalogoConsulta", {
      tipo: "consulta",
    }).then((res) => {
      if (res && res.ok && res.catalogos && res.catalogos.Marcas) {
        marcas = res.catalogos.Marcas.sort((a, b) => a.localeCompare(b));
        lista = marcas;
      }
    });
  }

  function filtrar() {
    if (!busqueda) {
      lista = marcas;
      return;
    }
    const q = busqueda.toLowerCase().trim();
    lista = marcas.filter((m) => m.toLowerCase().includes(q));
  }

  function toggleDropdown() {
    abierto = !abierto;
    if (abierto) {
      busqueda = "";
      lista = marcas;
      setTimeout(() => {
        if (input_busqueda) input_busqueda.focus();
      }, 50);
    }
  }

  function seleccionar(item) {
    marca = item;
    abierto = false;
  }

  function activarModoPersonalizado() {
    modo_personalizado = true;
    abierto = false;
  }

  function volverALista() {
    modo_personalizado = false;
  }
</script>

<svelte:window on:click={() => (abierto = false)} />

<div class="selector_marca" on:click|stopPropagation>
  {#if !modo_personalizado}
    <div
      class="trigger_select"
      class:activo={abierto}
      class:sin_valor={!marca}
      on:click={toggleDropdown}
      role="button"
      tabindex="0"
    >
      <div class="valor_contenedor">
        {#if marca}
          <span class="valor_texto">{marca}</span>
        {:else}
          <span class="placeholder_texto">Seleccionar marca...</span>
        {/if}
      </div>
      <i class="material-icons icono_chevron" class:rotado={abierto}>arrow_drop_down</i>
    </div>

    {#if abierto}
      <div class="dropdown_panel">
        <div class="busqueda_wrapper">
          <i class="material-icons icono_buscar">search</i>
          <input
            bind:this={input_busqueda}
            type="text"
            placeholder="Buscar marca..."
            bind:value={busqueda}
            on:input={filtrar}
          />
        </div>

        <div class="lista_scroll">
          {#each lista as item}
            <div
              class="item_opcion"
              class:seleccionado={marca === item}
              on:click={() => seleccionar(item)}
            >
              <span>{item}</span>
              {#if marca === item}
                <i class="material-icons icono_check">check</i>
              {/if}
            </div>
          {:else}
            <div class="sin_resultados">
              No se encontró "{busqueda}"
            </div>
          {/each}
        </div>

        <div class="dropdown_footer">
          <button type="button" class="btn_otra" on:click={activarModoPersonalizado}>
            <i class="material-icons">edit</i> Escribir marca personalizada...
          </button>
        </div>
      </div>
    {/if}
  {:else}
    <div class="input_personalizado_wrapper">
      <input
        type="text"
        class="input_personalizado"
        placeholder="Escribe la marca..."
        bind:value={marca}
      />
      <button type="button" class="btn_regresar" on:click={volverALista} title="Volver al catálogo">
        <i class="material-icons">list</i> Catálogo
      </button>
    </div>
  {/if}
</div>

<style>
  .selector_marca {
    position: relative;
    width: 100%;
  }

  .trigger_select {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 42px;
    padding: 8px 12px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    cursor: pointer;
    box-sizing: border-box;
    transition: all 0.2s ease;
  }

  .trigger_select:hover {
    border-color: #94a3b8;
  }

  .trigger_select.activo {
    border-color: #0284c7;
    box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
  }

  .valor_contenedor {
    display: flex;
    align-items: center;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .valor_texto {
    font-size: 13.5px;
    font-weight: 600;
    color: #0f172a;
  }

  .placeholder_texto {
    font-size: 13.5px;
    color: #94a3b8;
  }

  .icono_chevron {
    color: #64748b;
    font-size: 22px;
    transition: transform 0.2s ease;
  }

  .icono_chevron.rotado {
    transform: rotate(180deg);
    color: #0284c7;
  }

  .dropdown_panel {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.18);
    z-index: 1000;
    overflow: hidden;
  }

  .busqueda_wrapper {
    display: flex;
    align-items: center;
    padding: 8px 10px;
    border-bottom: 1px solid #f1f5f9;
    background: #f8fafc;
  }

  .icono_buscar {
    color: #94a3b8;
    font-size: 18px;
    margin-right: 6px;
  }

  .busqueda_wrapper input {
    width: 100%;
    border: none;
    background: transparent;
    font-size: 13px;
    color: #1e293b;
    outline: none;
  }

  .lista_scroll {
    max-height: 200px;
    overflow-y: auto;
    padding: 4px 0;
  }

  .item_opcion {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 14px;
    font-size: 13px;
    color: #334155;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .item_opcion:hover {
    background: #f0f9ff;
    color: #0284c7;
  }

  .item_opcion.seleccionado {
    background: #e0f2fe;
    color: #0284c7;
    font-weight: 700;
  }

  .icono_check {
    font-size: 16px;
    color: #0284c7;
  }

  .sin_resultados {
    padding: 12px;
    text-align: center;
    font-size: 12.5px;
    color: #94a3b8;
    font-style: italic;
  }

  .dropdown_footer {
    padding: 6px 8px;
    border-top: 1px solid #f1f5f9;
    background: #fafafa;
  }

  .btn_otra {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 6px 10px;
    border: none;
    background: transparent;
    color: #0284c7;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.15s;
  }

  .btn_otra:hover {
    background: #f0f9ff;
  }

  .btn_otra i {
    font-size: 15px;
  }

  .input_personalizado_wrapper {
    display: flex;
    gap: 8px;
    width: 100%;
  }

  .input_personalizado {
    flex: 1;
    min-height: 42px;
    padding: 8px 12px;
    background: #ffffff;
    color: #1e293b;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 13.5px;
    box-sizing: border-box;
    outline: none;
  }

  .input_personalizado:focus {
    border-color: #0284c7;
    box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
  }

  .btn_regresar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    color: #475569;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
  }

  .btn_regresar:hover {
    background: #e2e8f0;
    color: #0f172a;
  }

  .btn_regresar i {
    font-size: 16px;
  }
</style>
