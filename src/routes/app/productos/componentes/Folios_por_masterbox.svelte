<script>
  import { fade, fly } from "svelte/transition";
  export var lista = [];
  export var folios = []; //   folios que ya tiene
  export var producto;
  export var visible = false;
  import { Textfield, Button } from "svelte-mui/src";
  import { createEventDispatcher, onMount } from "svelte";
  import Masterbox_item from "./Masterbox_item.svelte";
  import Indicador_totales from "./indicador_totales.svelte";
  import Mandar_folios from "./Mandar_folios_de_masterbox.svelte";

  const dispatch = createEventDispatcher();
  var nuevo = "";
  var raiz_de_folio = "";
  var terminacion_numerica = "";
  var se_puede_autoincrementar = false;
  var usar_folio_como_ingreso = false;
  var folio_automaticos_paso = 1;
  var generadndo = false;
  var ingresando = false;
  var unidades = 6;
  var buscador = "";
  var buscador_mini = "";
  var input_listo = false;
  var contador_masterbox = 0;
  var contador_total_unidades = 0;
  var editando_masterboxes = false;
  var masterboxes_a_borrar = [];
  var subiendo_info = false;
  var confirmaciones = 2;
  var el_siguiente_es_mayuscula = false;
  var se_uso_control = false;

  export var cantidad_a_ingresar;

  onMount(() => {
    folio_automaticos_paso = 1;
    contador_masterbox = 0;
  });

  $: if (visible == false) {
    buscador = "";
    buscador_mini = "";
  }
  $: if (buscador) {
    if (buscador.length > 4) {
      buscador_mini = buscador.substr(buscador.length - 4, 4);
    } else {
      buscador_mini = "";
    }
  }

  function ingresar(params) {
    if (lista.length == 0) return;
    if (confirmaciones > 0) {
      confirmaciones--;
      return;
    }
    subiendo_info = true;
    return;

    //if (ingresando == true) return;
    ingresando = true;

    let folios = [];
    for (let i = 0; i < lista.length; i++) {
      const element = lista[i];
      folios = folios.concat(element.lista);
      if (i + 1 == lista.length) {
        console.log(folios);
      }
    }

    return;
    dispatch("nuevos_ingresos_producto", {});
  }

  function recontar() {
    let individual = 0;
    let masterboxes = 0;
    lista.map((elem) => {
      masterboxes++;
      elem.lista.forEach((element) => {
        individual++;
      });
    });
    console.log({ masterboxes, individual });
    contador_masterbox = masterboxes;
    contador_total_unidades = individual;
  }

  const handleKey = (evt) => {
    if (evt.key === "Enter") {
      if (nuevo == "") return;
      let resultado_ya_existia = checar_que_sea_unico(nuevo);
      console.log("existia =" + resultado_ya_existia);
      if (!resultado_ya_existia) {
        //lista.push(nuevo);
        //lista.splice(0, 0, nuevo);
        detectar_autoincrementable_en_folio(nuevo);
        usar_folio_como_ingreso = true;
        lista = lista;
        nuevo = "";
        dispatch("cambio_cantidad", { cantidad: lista.length });
        generar();
      }
    }
  };

  function cerrar() {
    lista = [];
    nuevo = "";
    raiz_de_folio = "";
    terminacion_numerica = "";
    se_puede_autoincrementar = false;
    usar_folio_como_ingreso = false;
    folio_automaticos_paso = 1;
    generadndo = false;
    ingresando = false;
    unidades = 6;
    buscador = "";
    buscador_mini = "";
    input_listo = false;
    contador_masterbox = 0;
    contador_total_unidades = 0;
    editando_masterboxes = false;
    masterboxes_a_borrar = [];
    subiendo_info = false;
    confirmaciones = 2;
    visible = false;
  }

  const handleKey2 = (evt) => {
    if (evt.key === "Enter") {
      generar();
    }
  };

  function generar() {
    //console.log(1);
    if (generadndo == true) return;
    generadndo = true;
    if (unidades < 1) return;
    //console.log(cantidad_a_ingresar);
    //console.log(2);
    let lista_nueva = [];
    for (let i = 0; i < unidades; i++) {
      let nuevo = raiz_de_folio + (+terminacion_numerica + +i);
      let resultado_ya_existia = checar_que_sea_unico(nuevo);
      if (!resultado_ya_existia) {
        //lista.splice(0, 0, nuevo);
        lista_nueva.push(nuevo);
        contador_total_unidades++;
      }
      if (i + 1 == unidades) {
        //console.log("Finaliza");
        //console.log(3);
        lista.push({
          indice: lista.length + 1,
          autor: "yo mero",
          lista: lista_nueva,
        });
        lista = lista;
        console.log({ lista });
        folio_automaticos_paso = 3;
        //lista.reverse();
        generadndo = false;
        contador_masterbox++;
        buscador_mini = "";
        buscador = "";
      }
    }
  }

  function borrar_todos_los_folios() {
    usar_folio_como_ingreso = false;
    lista = [];
  }

  function checar_que_sea_unico(folio) {
    var encontrado = lista.find((elem) => elem.lista.includes(folio));
    return encontrado;
  }

  function el_folio_no_se_ha_agregado_antes(folio) {
    let contador_encontrado = 0;
    console.log("------------- folio a buyscar" + folio);
    if (lista.length == 0) {
      return true;
    }
    for (let i = 0; i < lista.length; i++) {
      const element = lista[i];
      let lista_tmp = element.lista;
      console.log({ lista_tmp });
      console.log("buyscando " + folio);
      let encontrado = lista_tmp.find((elem) => folio == elem);
      console.log("encontrado=" + encontrado);
      if (encontrado) contador_encontrado++;
      if (i + 1 == lista.length) {
        console.log({ contador_encontrado });
        return contador_encontrado == 0;
      }
    }
  }

  async function detectar_autoincrementable_en_folio(folio) {
    let folio_separado = await separar_en_partes_un_folio(folio);
    se_puede_autoincrementar = folio_separado.se_puede;
    terminacion_numerica = folio_separado.numero;
    raiz_de_folio = folio_separado.raiz;
    console.log({ folio_separado });
    return se_puede_autoincrementar;
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

  async function key_en_svg(evt) {
    if (visible == true) {
      if (se_uso_control == true) {
        if (evt.key == "v" || evt.key == "V") {
          let clipboard = await navigator.clipboard.readText();
          buscador = clipboard;
          se_uso_control = false;
          return;
        } else {
          se_uso_control = false;
          return;
        }
      }
      if (evt.key == "Shift") {
        el_siguiente_es_mayuscula = true;
        return;
      }

      if (evt.key == "Control") {
        se_uso_control = true;
        return;
      }
      if (evt.key == "Backspace") {
        // if (buscador.length > 0) buscador.substr(0, buscador.length - 1);
        buscador = buscador.slice(0, -1);
        return;
      }
      if (evt.key == "Escape") {
        se_puede_autoincrementar = false;
        buscador = "";
        buscador_mini = "";
        input_listo = false;
      } else if (evt.key == "Enter") {
        input_listo = true;
        if (buscador == "") return;
        let se_puede_agregar = await el_folio_no_se_ha_agregado_antes(buscador);
        if (se_puede_agregar == false) {
          alert("No puedo agregar ese folio ya fue agregado");
          return;
        }

        await detectar_autoincrementable_en_folio(buscador);
        generar();
        return;
      } else {
        se_puede_autoincrementar = false;
        if (el_siguiente_es_mayuscula == true) {
          buscador += evt.key.toUpperCase();
          el_siguiente_es_mayuscula = false;
        } else {
          buscador += evt.key;
        }
      }
    }
  }
</script>

<svelte:window on:keydown={key_en_svg} />
{#if visible == true}
  {#if subiendo_info == true}
    <Mandar_folios on:cerrar={cerrar} {lista} producto_id={producto._id} />
  {:else}
    <div in:fade={{ duration: 150 }}>
      <svg
        width="95.384163mm"
        height="116.81561mm"
        viewBox="0 0 95.384163 116.81561"
        version="1.1"
        id="svg127945"
        xmlns="http://www.w3.org/2000/svg"
        xmlns:svg="http://www.w3.org/2000/svg"
      >
        <defs id="defs127942" />
        <g id="layer1" transform="translate(-29.747226,-1.0423339)">
          <text
            xml:space="preserve"
            style="font-style:normal;font-weight:normal;font-size:16.9333px;line-height:1.25;font-family:sans-serif;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke:none;stroke-width:0.264583"
            x="96.604042"
            y="15.318976"
            id="unidades"
            ><tspan
              style="font-size:16.9333px;text-align:center;text-anchor:middle;stroke-width:0.264583"
              x="96.604042"
              y="15.318976"
              id="tspan94684">{unidades}</tspan
            ></text
          >
          <text
            xml:space="preserve"
            style="font-style:normal;font-weight:normal;font-size:6.9333px;line-height:1.25;font-family:sans-serif;text-align:center;text-anchor:middle;fill:rgb(212 212 212);fill-opacity:1;stroke:none;stroke-width:0.264583"
            x="48.604042"
            y="13.318976"
            id="info"
            ><tspan
              style="font-size:3.9333px;text-align:center;text-anchor:middle;stroke-width:0.264583"
              x="48.604042"
              y="13.318976"
              id="tspan94684">Subir por Master-box</tspan
            ></text
          >
          <text
            xml:space="preserve"
            style="font-style:normal;font-weight:normal;font-size:6.9333px;line-height:1.25;font-family:sans-serif;text-align:center;text-anchor:middle;fill:rgb(181 181 181);fill-opacity:1;stroke:none;stroke-width:0.264583"
            x="48.604042"
            y="19.318976"
            id="info"
            ><tspan
              style="font-size:3.9333px;text-align:center;text-anchor:middle;stroke-width:0.264583"
              x="48.604042"
              y="19.318976"
              id="tspan94684">{producto.nombre}</tspan
            ></text
          >
          <g id="restar" on:click={() => unidades--}>
            <rect
              class="boton-gris"
              id="rect94690"
              width="21.263748"
              height="18.619129"
              x="76.270393"
              y="18.497025"
            />
            <text
              xml:space="preserve"
              class="no-select interior"
              style="font-style:normal;font-weight:normal;font-size:16.9333px;line-height:1.25;font-family:sans-serif;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke:none;stroke-width:0.264583"
              x="86.90226"
              y="32.344715"
              id="text94694"
              ><tspan
                style="font-size:16.9333px;text-align:center;text-anchor:middle;stroke-width:0.264583"
                x="86.90226"
                y="32.344715"
                id="tspan94692">-</tspan
              ></text
            >
          </g>

          <g id="sumar1" on:click={() => unidades++}>
            <rect
              class="boton-gris"
              id="rect94688"
              width="21.263748"
              height="18.619129"
              x="97.534142"
              y="18.497025"
            />
            <text
              xml:space="preserve"
              class="no-select"
              style="font-style:normal;font-weight:normal;font-size:16.9333px;line-height:1.25;font-family:sans-serif;text-align:center;text-anchor:middle;fill:#000000;fill-opacity:1;stroke:none;stroke-width:0.264583"
              x="108.18295"
              y="33.784046"
              id="text94698"
              ><tspan
                style="font-size:16.9333px;text-align:center;text-anchor:middle;stroke-width:0.264583"
                x="108.18295"
                y="33.784046"
                id="tspan94696">+</tspan
              ></text
            >
          </g>

          <rect
            style="fill:#333333;stroke-width:0.165"
            id="rect94792"
            width="41.840675"
            height="1.1652995"
            x="31.605381"
            y="56.611869"
          />
          {#if buscador.length > 5}
            <g
              id="g94800"
              style="fill:#000000"
              transform="translate(21.545482,3.757563)"
            >
              <circle
                style="fill:rgb(25 118 210);stroke-width:0.0987645"
                id="circle94794"
                cx="17.712044"
                cy="49.838184"
                r="0.78020346"
              />
              <circle
                style="fill:rgb(25 118 210);stroke-width:0.0987645"
                id="circle94796"
                cx="20.333443"
                cy="49.838184"
                r="0.78020346"
              />
              <circle
                style="fill:rgb(25 118 210);stroke-width:0.0987645"
                id="circle94798"
                cx="23.224302"
                cy="49.838184"
                r="0.78020346"
              />
            </g>
          {/if}
          <text
            xml:space="preserve"
            style="font-style:normal;font-weight:normal;font-size:4.5833px;line-height:1.25;font-family:sans-serif;fill:rgb(25 118 210);fill-opacity:1;stroke:none;stroke-width:0.264583"
            x="47.949814"
            y="55.032612"
            id="ultimos_digitos"
            ><tspan
              id="tspan94802"
              style="stroke-width:0.264583"
              x="47.949814"
              y="55.032612">{buscador_mini}</tspan
            ></text
          >
          <text
            xml:space="preserve"
            class="no-select"
            style="font-style:normal;font-weight:normal;font-size:3.5833px;line-height:1.25;font-family: 'Libre Barcode 39 Text', cursive;fill:#1976d2;fill-opacity:1;stroke:none;stroke-width:0.264583"
            x="47.949814"
            y="50.032612"
            id="ultimos_digitos"
            ><tspan
              id="tspan94802"
              style="stroke-width:0.264583;transform: translate3d(42px, -62px, -135px);"
              x="31.949814"
              y="40.032612">{buscador}</tspan
            ></text
          >

          <foreignobject class="node" x="46" y="22" width="100" height="100">
            <div style="border:1px green solid">
              I'm a div inside a SVG.<input type="text" />
            </div>
          </foreignobject>

          <g id="boton_guardar" on:click={ingresar}>
            <rect
              style={`fill:${
                contador_masterbox == 0 ? "#000000" : "#5eba7d"
              };stroke-width:0.165`}
              id="rect94814"
              width="42.936388"
              height="15.738949"
              x="76.110664"
              y="42.019688"
            />
            <text
              xml:space="preserve"
              style="font-style:normal;font-weight:normal;font-size:4.33178px;line-height:1.25;font-family:sans-serif;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.158295"
              x="78.503029"
              class="no-select"
              y="51.236233"
              id="text94818"
              ><tspan
                id="tspan94816"
                style="fill:#ffffff;stroke-width:0.158295"
                x="78.503029"
                y="51.236233"
              >
                {#if contador_masterbox == 0}
                  listo, escanea !
                {:else}
                  guardar
                  {#if confirmaciones < 2}
                    ,confirma {confirmaciones + 1} veces
                  {/if}
                {/if}
              </tspan></text
            >
          </g>

          <g id="cerrar" on:click={() => (visible = false)}>
            <rect
              style="fill:#e6e6e6;stroke-width:0.165"
              id="rect966"
              width="6.6272984"
              height="8.7486906"
              x="88.605545"
              y="0.23888317"
            />
            <g
              aria-label="x"
              id="text4024"
              style="font-size:10.5833px;line-height:1.25;stroke-width:0.264583"
              transform="matrix(0.52994727,0,0,0.52994727,43.017114,2.1993024)"
            >
              <path
                d="m 91.721633,4.4915309 -1.95791,-2.7728245 h 1.05833 L 92.282548,3.856533 93.73246,1.7187064 h 1.047747 L 92.822297,4.4915309 94.88604,7.391355 H 93.82771 L 92.282548,5.1265289 90.71622,7.391355 h -1.047747 z"
                id="path5333"
              />
            </g>
          </g>
        </g></svg
      >

      {#if lista.length}
        <div style="">
          <Indicador_totales
            bind:contador_total_unidades
            bind:contador_masterbox
          />
        </div>
      {/if}
      <div class="contenedor">
        {#if lista.length}
          <div class="barra">
            <button
              on:click={() => {
                editando_masterboxes = !editando_masterboxes;
                masterboxes_a_borrar = [];
              }}
            >
              {#if editando_masterboxes == true}
                Editando
              {:else}
                <i class="material-icons">create</i>
              {/if}
            </button>

            {#if masterboxes_a_borrar.length > 0}
              <button
                on:click={() => {
                  lista = lista.filter((elem, i) => {
                    if (masterboxes_a_borrar.includes(i) == false) {
                      return elem;
                    }
                  });
                  recontar();
                  lista = lista;
                  console.log(lista);
                  editando_masterboxes = false;
                  masterboxes_a_borrar = [];
                }}
              >
                <i class="material-icons">delete</i>
              </button>
            {/if}
          </div>
        {/if}
        {#each lista as item, i (i)}
          <div>
            <Masterbox_item
              on:borrar_indice={(evt) => {
                let indice_a_borrar = evt.detail.indice;
                masterboxes_a_borrar.push(indice_a_borrar);
                masterboxes_a_borrar = masterboxes_a_borrar;
                console.log(masterboxes_a_borrar);
              }}
              on:no_borrar_indice={(evt) => {
                let indice_a_borrar = evt.detail.indice;

                masterboxes_a_borrar = masterboxes_a_borrar.filter(
                  (elem) => elem != indice_a_borrar
                );
                masterboxes_a_borrar = masterboxes_a_borrar;
                console.log(masterboxes_a_borrar);
              }}
              bind:editando={editando_masterboxes}
              indice={i}
              autor="yo9 mero"
              lista={item.lista}
            />
          </div>
        {:else}
          Sin masterbox capturados
        {/each}
      </div>
    </div>
  {/if}
{/if}

<style>
  .barra {
    /* transform: translateY(-15px); */
    height: 40px;
    background: #1976d2;
    width: 51vw;
    padding: 5px;
    border-radius: 5px 5px 0px 0px;
  }
  #cerrar {
    transform: translateX(28px);
  }
  .boton-gris {
    fill: #e6e6e6;
    stroke-width: 0.165;
    transition: all 150ms ease-out;
  }
  .boton-gris:hover {
    fill: #f3f1f1;
    stroke-width: 0.165;
  }
  .interior:hover + .boton-gris {
    fill: #f3f1f1;
    stroke-width: 0.165;
  }
  .boton-gris:active {
    fill: #c7c7c7;
    stroke-width: 0.165;
  }
  .no-select {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  svg {
    position: absolute;
    z-index: 8;
    background: white;
    width: 100vw;
    top: 0px;
    height: 100vh;
    left: 0px;
  }
  .contenedor {
    display: flex;
    /* padding: 26px; */
    flex-wrap: wrap;
    background: #e6e6e6;
    top: 53vh;
    z-index: 17;
    position: absolute;
    width: 51vw;
    margin-left: 25vw;
    left: 0px;
    max-height: 50vh;
    overflow-y: auto;
    /* padding: 26px; */
  }
</style>
