<script>
    export var cantidad = 0;
</script>

<div class="relativo">
    <img src={"imagenes/ver_almacen_personal"} alt="" />
    <div class="cantidad">
        {cantidad}
    </div>
</div>
indica

<style>
    .relativo {
        position: relative;
    }
    .cantidad {
        text-align: center;
        height: 60px;
        width: 60px;
        background: red;
        color: white;
        position: absolute;
        transform: translate(10px 10px);
    }
</style>
