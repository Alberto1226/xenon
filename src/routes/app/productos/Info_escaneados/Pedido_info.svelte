<script>
    export var _id;
    export var nombre;
    export var folio;
    export var status;
    // export var existencia;
    export var galeria_imagenes = [];
</script>

<div class="flex row">
    <div>
        <img
            src={galeria_imagenes[0]
                ? galeria_imagenes[0]
                : "imagenes/producto_generico.svg"}
            alt=""
            class="imagen"
        />
    </div>

    <div class="nombre">
        El producto se encuentra en el carrito {folio}.
        <br />
        A nombre del Cliente: {nombre} <br />
        <div class="id">{_id}</div>
    </div>
    <!-- <div class="existencias" title="Existencias actuales">
        X {existencia.actual}
    </div> -->
</div>

<style>
    .existencias {
        font-size: 38px;
        color: gray;
        margin: auto;
    }
    .nombre {
        font-size: 16px;
        margin: auto;
    }
    .id {
        font-size: 12px;
        color: gray;
    }
    .row {
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
