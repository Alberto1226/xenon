<script>
    export var folio, cliente, fecha;
</script>

<div class="flex row" on:click>
    <div class="folio">{folio}</div>
    <div class="cliente">
        {cliente.nombre}
    </div>
    <div class="fecha">{fecha}</div>
</div>

<style>
    .row {
        cursor: pointer;
        width: 100%;
        border-bottom: 1px solid gray;
    }
    .row:hover {
        background: rgba(128, 128, 128, 0.26);
    }
    .fecha {
        padding: 10px;
    }
    .folio {
        font-size: 2em;
        padding: 10px;
        color: #4400ff;
    }
    .cliente {
        font-size: 2em;
        padding: 10px;
    }
    .flex {
        display: flex;
    }
</style>
