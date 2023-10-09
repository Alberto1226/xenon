<script>
    export var indice;
    export var producto = { nombre: "", id: "" };
    export var folios = [{ folio: "", existe: false }];
</script>

<div class="producto ">
    <div class="flex">
        <div class="indice">
            {indice + 1} )
        </div>
        <div class="nombre">
            {producto.nombre}
        </div>
        <div class="id">
            {producto.id}
        </div>
    </div>

    {#each folios as item, i}
        <div class="contenedor flex" on:click>
            <div class="indice">
                {indice + 1}.{i + 1} )
            </div>
            <div class="folio">
                {item.folio}
            </div>
        </div>
    {/each}
</div>

<style>
    .flex {
        display: flex;
    }
    .id {
        color: gray;
        font-size: 9px;
        vertical-align: bottom;
        margin: auto 0px;
        margin-left: 15px;
    }
    .folio {
        padding-left: 15px;
        color: #0065ff;
    }
    .indice {
        color: gray;
        font-size: 0.8em;
        vertical-align: middle;
        margin-right: auto 5px;
    }
    .contenedor {
        width: calc(100% - 90px);
        margin-left: 50px;
        padding: 10px;
        border-bottom: 1x gray solid;
    }
    .contenedor:hover {
        background: #80808015;
    }
    .producto {
        border: 1px solid rgb(175, 175, 175);
        border-radius: 5px;
        padding: 10px;
    }
    .producto:hover {
        border: 1px solid black;
    }
</style>
