<script>
  export var lista = [];

  import { Textfield, Button } from "svelte-mui/src";
  import { createEventDispatcher, onMount } from "svelte";
  const dispatch = createEventDispatcher();
  var nuevo = "";
  var raiz_de_folio = "";
  var terminacion_numerica = "";
  var se_puede_autoincrementar = false;
  var usar_folio_como_ingreso = false;
  var folio_automaticos_paso = 1;
  var generadndo = false;
  var ingresando = false;

  export var cantidad_a_ingresar;

  onMount(() => {
    folio_automaticos_paso = 1;
  });

  function ingresar(params) {
    if (ingresando == true) return;
    ingresando = true;
    dispatch("ingresar");
  }

  const handleKey = (evt) => {
    if (evt.key === "Enter") {
      if (nuevo == "") return;
      let resultado_ya_existia = checar_que_sea_unico(nuevo);
      console.log("existia =" + resultado_ya_existia);
      if (!resultado_ya_existia) {
        //lista.push(nuevo);
        lista.splice(0, 0, nuevo);
        detectar_autoincrementable_en_folio(nuevo);
        usar_folio_como_ingreso = true;
        lista = lista;
        nuevo = "";
        dispatch("cambio_cantidad", { cantidad: lista.length });
      }
    }
  };

  const handleKey2 = (evt) => {
    if (evt.key === "Enter") {
      generar();
    }
  };

  function generar() {
    //console.log(1);
    if (generadndo == true) return;
    generadndo = true;
    if (cantidad_a_ingresar < 1) return;
    //console.log(cantidad_a_ingresar);
    //console.log(2);
    for (let i = 0; i < cantidad_a_ingresar; i++) {
      let nuevo = raiz_de_folio + (+terminacion_numerica + +i);
      let resultado_ya_existia = checar_que_sea_unico(nuevo);
      if (!resultado_ya_existia) {
        lista.splice(0, 0, nuevo);
      }
      if (i + 1 == cantidad_a_ingresar) {
        //console.log("Finaliza");
        //console.log(3);
        cantidad_a_ingresar = lista.length;
        //console.log({ lista });
        folio_automaticos_paso = 3;
        lista.reverse();
        generadndo = false;
      }
    }
  }

  function borrar_todos_los_folios() {
    usar_folio_como_ingreso = false;
    lista = [];
  }

  function checar_que_sea_unico(folio) {
    var encontrado = lista.find((elem) => elem == folio);
    return encontrado;
  }

  function borrar_uno(index) {
    lista.splice(index, 1);
    lista = lista;
    dispatch("cambio_cantidad", { cantidad: lista.length });
    return encontrado;
  }

  async function detectar_autoincrementable_en_folio(folio) {
    let folio_separado = await separar_en_partes_un_folio(folio);
    se_puede_autoincrementar = folio_separado.se_puede;
    terminacion_numerica = folio_separado.numero;
    raiz_de_folio = folio_separado.raiz;
    console.log({ folio_separado });
  }

  function separar_en_partes_un_folio(folio) {
    console.log(folio);
    let termina_en_numero = !isNaN(folio[folio.length - 1]);
    let numero = "";
    var continua = true; // cuando se rompe la secunecia de numeros si es que pasas este cambia
    console.log({ termina_en_numero });
    var raiz = ""; //  es el texto que precede a el numero autoincremental
    if (termina_en_numero == false) {
      return {
        se_puede: false,
        raiz: folio,
        numero: 0,
      };
    }
    for (let i = 0; i < folio.length; i++) {
      let es_numero = !isNaN(folio[folio.length - (i + 1)]);
      if (es_numero == false) {
        continua = false;
      }
      if (continua == true) {
        numero = folio[folio.length - (i + 1)] + numero;
      } else {
        raiz = folio[folio.length - (i + 1)] + raiz;
        console.log({ raiz });
      }
      if (folio.length == i + 1) {
        return {
          se_puede: numero.length > 0,
          raiz: raiz,
          numero: numero,
        };
      }
    }
  }
</script>

{#if folio_automaticos_paso == 1}
  <div class="contenedor_lector">
    <span class="inciso"
      >B) Ingresar con Folio (manual o con pistola), de uno por uno.</span
    >
    <img src="imagenes/barras.png" alt="" />
    <Textfield
      bind:value={nuevo}
      label="Folio nuevo"
      palceholder="Teclea el folio o usa la pistola lectora"
      on:keyup={handleKey}
    />

    {#if lista.length > 0}
      <div class="contenedor_de_lista">
        Capturados <b class="color_azul">{lista.length}</b>

        {#each lista as item, i}
          <div class="flex completo" id={i}>
            <div class="ochenta">
              {i + 1}) {item}
            </div>
            <Button
              color="red"
              dense
              icon
              raised
              on:click={() => borrar_uno(i)}
            >
              <i class="material-icons">delete</i>
            </Button>
          </div>
        {:else}
          Sin Folios capturados
        {/each}
      </div>
      <div class="div-dos-botones">
        <Button
          raised
          dense
          color="red"
          style="width:50%"
          on:click={borrar_todos_los_folios}
          title="Borrar todos los folios en lista"
        >
          Borrar toda la lista <i class="material-icons">delete</i>
        </Button>
        <Button
          raised
          dense
          style="width:50%; margin-left:10px;"
          color="primary"
          on:click={ingresar}
          title="Borrar todos los folios en lista"
        >
          Ingresar<i class="material-icons">add_circle</i>
        </Button>
      </div>
    {/if}
  </div>
{/if}

{#if lista.length > 0}
  <div class=" capturados_titulo">
    {#if se_puede_autoincrementar == true}
      {#if folio_automaticos_paso == 1}
        <div class="secuenciar">
          <span class="inciso"
            >C) Ingresar con Folio: usando el último que has introducido :

            <span class="raiz">{raiz_de_folio}</span><span class="numerico"
              >{terminacion_numerica}</span
            >
          </span>
          <img src="imagenes/laser robot2.svg" alt="" />
          Secuenciar a partir de este
          <span class="raiz">{raiz_de_folio}</span><span class="numerico"
            >{terminacion_numerica}</span
          >
          ? <Button
            raised
            color="primary"
            on:click={() => {
              folio_automaticos_paso = 2;
            }}>si, continuar</Button
          >
        </div>
      {:else if folio_automaticos_paso == 2}
        <div class="contenedor_autofliado">
          <div class="centrado">
            <img src="imagenes/laser robot cuantos.svg" alt="" />
            Folio :
            {raiz_de_folio}<span class="numerico">{terminacion_numerica}</span>
          </div>
          <Textfield
            bind:value={cantidad_a_ingresar}
            min="1"
            style="font-size: 2em;"
            label="Cantidad total de folios (incluyendo el capturado)"
            type="number"
            palceholder="Cantidad total de folios"
            on:keyup={handleKey2}
          />

          <Button
            title="Cancelar el desgloce de folios automaticamente"
            raised
            color="orange"
            on:click={() => {
              folio_automaticos_paso = 1;
            }}
          >
            regresar</Button
          >
          {#if generadndo == false}
            <Button
              title="Generar folios"
              raised
              color="primary"
              on:click={generar}
            >
              Aceptar</Button
            >
          {/if}
        </div>
      {:else if folio_automaticos_paso == 3}
        <div class="contenedor_autofliado">
          {#each lista as item, i}
            <div class="row_final">
              {i + 1}) {item}
            </div>
          {:else}
            No hay folios
          {/each}

          {#if ingresando == false}
            <Button
              title="Generar folios"
              raised
              color="primary"
              disabled={ingresando}
              on:click={ingresar}
            >
              Ingresar <i class="material-icons">add_circle</i>
            </Button>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .div-dos-botones {
    display: flex;
    margin-top: 19px;
  }
  .inciso {
    /* position: absolute; */
    color: #1976d2;
    transform: translate(-29px, -6px);
    font-weight: 900;
  }
  .secuenciar {
    border: solid black 1px;
    border-radius: 5px;
    padding: 15px;
  }
  .contenedor_autofliado {
    position: relative;
    border: 1px black solid;
    border-radius: 5px;
    padding: 15px;
  }
  .numerico {
    text-decoration: underline;
  }
  .raiz {
    color: gray;
  }
  .capturados_titulo {
    text-align: center;
    margin-bottom: 10px;
    font-weight: 700;
    margin-top: 17px;
  }
  .completo {
    margin-top: 10px;
    margin-bottom: 10px;
    width: 100%;
  }
  .ochenta {
    width: 80%;
    text-align: left;
  }
  .ochenta:hover {
    background: rgb(63, 63, 63);
    color: white;
  }
  .flex {
    display: flex;
  }

  .contenedor_de_lista {
    max-height: 180px;
    overflow-y: auto;
    background: #d4d4d4;
  }
  .color_azul {
    color: #1976d2;
  }
  .contenedor_lector {
    border: black solid 1px;
    padding: 15px;
    border-radius: 3px;
  }
  .row_final {
    font-weight: 200;
    border-bottom: gray 1px solid;
    text-align: left;
    padding: 6px 0px;
  }
</style>
