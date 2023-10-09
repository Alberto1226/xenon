<script>
    import { createEventDispatcher } from "svelte";

    import { fly, fade, scale } from "svelte/transition";
    const dispatch = createEventDispatcher();
    export var autor = "ernesto...";
    export var indice = "";
    export var lista = [];
    export var terminacion_1;
    export var terminacion_2;
    export var borrar = false;
    export var editando = false;
    var primer_mini = "";
    var segundo_mini = "";
    var mostrando_detalles = false;

    $: if (lista.length > 1) {
        let primer_registro = lista[0];
        let ultimo_registro = lista[lista.length - 1];
        console.log(primer_registro);

        console.log(ultimo_registro);
        if (primer_registro.length > 4)
            terminacion_1 = primer_registro.substr(
                primer_registro.length - 4,
                4
            );
        if (ultimo_registro.length > 4)
            terminacion_2 = ultimo_registro.substr(
                ultimo_registro.length - 4,
                4
            );
    }
    $: if (editando == false) {
        borrar = false;
    }

    function toggle() {
        if (editando == true) {
            borrar = !borrar;
            if (borrar == true) {
                dispatch("borrar_indice", { indice: indice });
            } else {
                dispatch("no_borrar_indice", { indice: indice });
            }
        }
    }
</script>

<div
    class=""
    on:click={toggle}
    on:dblclick={() => {
        mostrando_detalles = !mostrando_detalles;
        editando = false;
    }}
>
    <svg
        width="33.622078mm"
        height="36.810026mm"
        viewBox="0 0 23.622078 26.810026"
        version="1.1"
        id="svg6028"
        xmlns="http://www.w3.org/2000/svg"
        xmlns:svg="http://www.w3.org/2000/svg"
    >
        <defs id="defs6025" />
        <g id="layer1" transform="translate(-56.015949,-157.19014)">
            <rect
                in:fly={{ y: 100, duration: 150 }}
                style={`fill:${
                    borrar != true ? "#666666" : "rgb(255 0 0)"
                };stroke-width:0.165`}
                id="rect94702"
                width="23.054842"
                height="21.846666"
                x="56.015949"
                y="162.1535"
            />
            <circle
                style="fill:#ffffff;fill-opacity:1;stroke-width:0.165"
                id="path102815"
                cx="77.683594"
                cy="159.14458"
                r="1.9544327"
            />
            <circle
                on:click={() => {
                    mostrando_detalles = true;
                }}
                in:fade={{ duration: 150, delay: 200 }}
                style="fill:##1f4d80;fill-opacity:1;stroke-width:0.165  ;  fill: darkcyan;"
                id="path102816"
                cx="62.683594"
                cy="162.14458"
                r="2.9544327"
            />
            <path
                d="m 77.477695,177.98037 -2.645833,-1.45521 a 0.26458333,0.26458333 0 0 0 -0.255005,0 l -2.645834,1.45521 a 0.26458333,0.26458333 0 0 0 0,0.46355 l 2.508753,1.37988 v 2.83562 l -0.803328,-0.44167 -0.255005,0.46353 1.195414,0.65743 a 0.26416,0.26416 0 0 0 0.255005,0 l 2.645833,-1.45521 a 0.26458333,0.26458333 0 0 0 0.137081,-0.23177 v -3.43958 a 0.26458333,0.26458333 0 0 0 -0.137081,-0.23178 z m -2.773336,-0.92138 2.09677,1.15316 -2.09677,1.15316 -2.09677,-1.15316 z m 2.38125,4.43629 -2.116666,1.16417 v -2.83565 l 2.116666,-1.16417 z"
                id="path94704"
                style="fill:rgb(255 255 255 / 20%);stroke-width:0.264583"
            />
            <rect
                x="-72.323112"
                y="-179.93195"
                width="2.1166666"
                height="0.52916664"
                transform="scale(-1)"
                id="rect94706"
                style="fill:rgb(255 255 255 / 20%);stroke-width:0.264583"
            />
            <rect
                x="-72.85228"
                y="-182.0486"
                width="2.1166666"
                height="0.52916664"
                transform="scale(-1)"
                id="rect94708"
                style="fill:rgb(255 255 255 / 20%);stroke-width:0.264583"
            />
            <rect
                x="-73.381447"
                y="-180.99028"
                width="2.1166666"
                height="0.52916664"
                transform="scale(-1)"
                id="rect94710"
                style="fill:rgb(255 255 255 / 20%);stroke-width:0.264583"
            />
            <circle
                style="    fill: rgb(255 255 255 / 40%);stroke-width:0.0987645"
                id="circle94714"
                cx="61.152485"
                cy="167.7627"
                r="0.78020346"
            />
            <circle
                style="    fill: rgb(255 255 255 / 40%);stroke-width:0.0987645"
                id="circle94716"
                cx="63.773884"
                cy="167.7627"
                r="0.78020346"
            />
            <circle
                style="    fill: rgb(255 255 255 / 40%);stroke-width:0.0987645"
                id="circle94718"
                cx="66.664742"
                cy="167.7627"
                r="0.78020346"
            />
            <text
                xml:space="preserve"
                style="font-style:normal;font-weight:normal;font-size:4.71181px;line-height:1.25;font-family:sans-serif;text-align:end;text-anchor:end;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.117795"
                x="77.018242"
                class="no-select"
                y="168.79861"
                id="terminacion_1"
                ><tspan
                    in:fly={{ delay: 650, y: 100, duration: 150 }}
                    style="text-align:end;text-anchor:end;fill:#ffffff;stroke-width:0.117795"
                    x="77.018242"
                    y="168.79861"
                    id="tspan94720"
                    >{terminacion_1 == undefined
                        ? lista[0]
                        : terminacion_1}</tspan
                ></text
            >
            <text
                xml:space="preserve"
                style="font-style:normal;font-weight:normal;font-size:1.54616px;line-height:1.25;font-family:sans-serif;text-align:start;text-anchor:start;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.038654"
                x="57.616901"
                y="182.74367"
                id="autor"
                ><tspan
                    style="text-align:start;text-anchor:start;fill:#ffffff;stroke-width:0.038654"
                    x="57.616901"
                    class="no-select"
                    y="182.74367"
                    id="tspan94724">Master-box</tspan
                ></text
            >
            <text
                xml:space="preserve"
                style="font-style:normal;font-weight:normal;font-size:2.34944px;line-height:1.25;font-family:sans-serif;text-align:center;text-anchor:middle;fill:rgb(102 102 102);fill-opacity:1;stroke:none;stroke-width:0.0587359"
                x="77.672211"
                y="160.00641"
                class="no-select"
                id="indice"
                title="Índice de master-box"
                ><tspan
                    style="text-align:center;text-anchor:middle;fill:rgb(102 102 102);stroke-width:0.0587359"
                    x="77.672211"
                    y="160.00641"
                    id="tspan94728">{indice + 1}</tspan
                ></text
            >

            <text
                on:click={() => {
                    mostrando_detalles = true;
                }}
                title="Unidades"
                xml:space="preserve"
                style="font-style:normal;font-weight:800;font-size:2.80944px;line-height:1.25;font-family:sans-serif;text-align:center;text-anchor:middle;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.0587359"
                x="62.672211"
                y="163.00641"
                class="no-select"
                id="unidades"
                ><tspan
                    style="text-align:center;text-anchor:middle;fill:rgb(255 255 255);stroke-width:0.0587359"
                    x="62.672211"
                    y="163.00641"
                    id="tspan94728f">{lista.length}</tspan
                ></text
            >
            <text
                xml:space="preserve"
                class="no-select"
                style="font-style:normal;font-weight:normal;font-size:3.71181px;line-height:1.25;font-family:sans-serif;text-align:end;text-anchor:end;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.117795"
                x="77.018242"
                y="175.73778"
                id="terminacion_2"
                ><tspan
                    in:fade={{ delay: 450, duration: 150 }}
                    style="text-align:end;text-anchor:end;fill:#ffffff;stroke-width:0.117795"
                    x="77.018242"
                    y="175.73778"
                    id="tspan117840"
                    >{terminacion_2 == undefined
                        ? lista[lista.length - 1]
                        : terminacion_2}</tspan
                ></text
            >
            <circle
                style="    fill: rgb(255 255 255 / 40%);stroke-width:0.0987645"
                id="circle94734"
                cx="60.901352"
                cy="174.47832"
                r="0.78020346"
            />
            <circle
                style="    fill: rgb(255 255 255 / 40%);stroke-width:0.0987645"
                id="circle94736"
                cx="63.522751"
                cy="174.47832"
                r="0.78020346"
            />
            <circle
                style="    fill: rgb(255 255 255 / 40%);stroke-width:0.0987645"
                id="circle94738"
                cx="66.413612"
                cy="174.47832"
                r="0.78020346"
            />
        </g>
    </svg>
    {#if editando == true}
        <div class="relativo">
            <input class="check" type="checkbox" bind:checked={borrar} />
        </div>
    {/if}

    {#if mostrando_detalles == true && editando == false}
        <div
            class=" detalles no-select"
            in:fly={{ duration: 150, y: -10 }}
            on:click={() => {
                mostrando_detalles = false;
            }}
        >
            {#each lista as item}
                {item} <br />
            {/each}
        </div>
    {/if}
</div>

<style>
    .detalles {
        position: absolute;
        z-index: 2;
        top: 91px;
        transform: translate(6px, -30px) rotate3d(1, 1, 1, 0deg);
        box-shadow: 0 0 55px 7px black;
        padding: 20px;
        background: white;
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
        margin: 6px;
        border: 1px solid transparent;
        padding: 2px;
        cursor: pointer;
    }
    svg:hover {
        border: 1px gray solid;
        background: white;
    }

    .check {
        position: absolute;
        transform: translate(19px, -44px);
    }
    .relativo {
        position: relative;
    }
</style>
