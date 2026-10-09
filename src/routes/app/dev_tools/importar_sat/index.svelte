<script>
  import { onMount } from "svelte";
  import { postData, mensaje_bueno, mensaje_error } from "./../../../stores";

  let carpeta = "";
  let tablas = {};
  let cargando = false;
  let importando = "";

  onMount(consultar_estado);

  async function consultar_estado() {
    const r = await postData("app/dev_tools/importar_sat/importar_sat", { accion: "estado", carpeta: carpeta || undefined });
    if (r && r.ok) {
      tablas = r.tablas;
      if (!carpeta) carpeta = r.carpeta_default;
    } else {
      mensaje_error((r && r.mensaje) || "No se pudo consultar el estado");
    }
  }

  async function importar(tabla) {
    importando = tabla;
    const r = await postData("app/dev_tools/importar_sat/importar_sat", { accion: "importar", tabla, carpeta });
    importando = "";
    if (r && r.ok) mensaje_bueno(r.mensaje);
    else mensaje_error((r && r.mensaje) || "Error al importar");
    consultar_estado();
  }
</script>

<main>
  <h2>Importar catálogos SAT (SQL → Mongo)</h2>
  <p>Solo entorno local. Reemplaza el contenido de la colección con el del archivo .sql.</p>
  <label for="carpeta_sql">Carpeta con los archivos .sql</label>
  <input id="carpeta_sql" type="text" bind:value={carpeta} on:change={consultar_estado} style="width:100%;padding:8px;" />

  <table style="margin-top:16px;width:100%;">
    <thead><tr><th>Tabla</th><th>Archivo</th><th>Registros en Mongo</th><th></th></tr></thead>
    <tbody>
      {#each Object.entries(tablas) as [nombre, t]}
        <tr>
          <td>{nombre}</td>
          <td>{t.archivo_existe ? "Encontrado" : "No encontrado"}</td>
          <td>{t.registros_en_mongo}</td>
          <td>
            <button disabled={!t.archivo_existe || importando !== ""} on:click={() => importar(nombre)}>
              {importando === nombre ? "Importando..." : "Importar"}
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</main>
