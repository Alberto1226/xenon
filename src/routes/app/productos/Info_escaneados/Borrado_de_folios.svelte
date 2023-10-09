<script>
    /* aqui se define la entrada de un producto por medio de un snaplog  */
    import { convertir_a_fecha_humana } from "./../../../stores";
    export var fecha;
    export var id;
    export var producto;
    export var cantidad, inventario_antes, inventario_despues;
    export var folios = [];
    export var hay_registro = false;

    /* 
    estructura
    inventario_antes ={
        existencias: { type: Number, default: 0 },
        apartados: { type: Number, default: 0 },
    }*/
</script>

{#if hay_registro == true}
    <div class="contenedor flex">
        <div class="iconos">
            <img
                class="borrado-de-folios "
                src="imagenes/borrado_de_folios.svg"
                alt=""
            />

            <br />
            <span class="id">
                {id}
            </span>
        </div>
        <div class="intro">
            {producto.nombre}
            <br />

            El folio fue borrado manualmente <br />
            <div class="sobresaltar">
                {convertir_a_fecha_humana(fecha)} <br />
                {new Date(fecha).toLocaleTimeString("es-MX")} <br />
            </div>
        </div>
        <div>
            <div class="centrado">
                Cantidad de folios borrados
                <br />
                en la misma acción
            </div>
            <br />
            <div class="cantidad">
                X{cantidad}
            </div>
        </div>

        <div class="inventario-apartados">
            <span class="apartados">
                {inventario_antes.apartados}
            </span>
            <i class="material-icons">forward</i>
            <span class="apartados">
                {inventario_despues.apartados}
            </span> <br />
            <div class="letras-grises ">Apartados</div>
        </div>

        <div class="inventario-existencias">
            <span class="existencias">
                {inventario_antes.existencias}
            </span>
            <i class="material-icons">forward</i>
            <span class="existencias">
                {inventario_despues.existencias}
            </span>
            <br />
            <div class="letras-grises ">Existencias</div>
        </div>
    </div>
{:else}
    <div class="sin-registro centrado" />
{/if}

<style>
    .borrado-de-folios {
        height: 90px;
    }
    .marca {
        position: absolute;
        transform: translate(14px, 5px);
        height: 16px;
        transition: ease-in-out transform 50ms;
    }
    .iconos {
        width: 10%;
    }
    .sobresaltar {
        padding: 15px;
        border-radius: 5px;
        border: solid 1px black;
    }
    .inventario-apartados {
        width: 10%;
        font-size: 38px;
    }
    .inventario-existencias {
        width: 10%;
        font-size: 38px;
        padding-right: 35px;
    }
    .sin-registro {
        color: white;
    }
    .cantidad {
        font-size: 38px;
        font-weight: 800;
        padding: 4px;
        margin-left: 11px;
        background-color: #194d82;
        border: 1px solid #15416d;
        box-shadow: 0 0 3px #194d82;
        color: white;
        border-radius: 20px;
        width: 190px;
        text-align: center;
        padding-top: 7px;
        margin: 0 auto;
    }
    .apartados {
        color: blue;
    }
    .existencias {
        font-size: 38px;
        color: gray;
        margin: auto;
    }
    .intro {
        font-size: 16px;
        margin: auto;
    }
    .id {
        font-size: 12px;
        color: gray;
        transform: translateY(80px);
    }
    .letras-grises {
        font-size: 12px;
        color: gray;
    }
    .contenedor {
        font-size: medium;
        padding: 23px;
        background: white;
    }
    .flex {
        display: flex;
    }
    .imagen {
        margin: auto;
        height: 100px;
        border-radius: 15px;
    }
</style>
