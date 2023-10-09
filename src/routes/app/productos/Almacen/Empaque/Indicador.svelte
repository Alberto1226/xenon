<script>
    export var cantidad = 0;
</script>

<div class="relativo">
    <img src={"imagenes/ver_almacen_personal.svg"} alt="" />
    <div class="cantidad">
        {cantidad}
    </div>
</div>

<style>
    .relativo {
        position: relative;
        transform: translate(10px, 10px);
        margin-bottom: 7px;
    }
    .cantidad {
        font-size: 2em;
        position: absolute;
        transform: translate(50px, -82px);
        background: #222d32;
        color: white;
        border-radius: 12px;
        padding: 3px;
        text-align: center;
    }
</style>
