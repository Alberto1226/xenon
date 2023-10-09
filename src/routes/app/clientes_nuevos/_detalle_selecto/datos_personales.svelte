<script>
    export var nombre = "";
    export var correo = "";
    export var telefono = "";
    export var fecha_nacimiento = new Date();
    export var createdAt = new Date();
    import Fecha from "./fecha.svelte";
</script>

<style>
    .display-flex {
        display: flex;
    }
    .valor{
        font-weight:700;
    }

    .contenedor{
        width: fit-content;
    margin: 0 auto;
    padding: 2%;
    }
    .celda{
        width: 150px;
        height: 36px;
    }
  
    .titulo{
        font-size: 1.4em;
    }
</style>
<div class="centrado titulo">
    Datos Personales
</div>
<div class="contenedor">


    <div class="display-flex">
        <div class="display-flex">
            <div class="celda">Nombre:</div>
            <div class="valor celda">{nombre}</div>
        </div>
        <div class="display-flex">
            <div class="celda">Correo:</div>
            <div class="valor celda">{correo}</div>
        </div>
    </div>
    
    <div class="display-flex">
        <div class="display-flex">
            <div class="celda">Teléfono:</div>
            <div class="valor celda">{telefono}</div>
        </div>
        <div class="display-flex">
            <div class="celda">Creado desde:</div>
            <div class="valor celda">
                <Fecha fecha={createdAt} cumple={false} />
            </div>
        </div>
    </div>
    <div class="display-flex">
        <div class="display-flex">
            <div class="celda">Fecha de nacimiento:</div>
    
            <div class="valor celda">
                <Fecha fecha={fecha_nacimiento} cumple={true} />
            </div>
        </div>
    </div>
    
</div>
