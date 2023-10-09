<script>

    export var direccion={};
</script>
<style>
    .display-flex{
        display:flex;
    }
    .valor {
        font-weight: 700;
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
    Dirección
</div>
<div class="contenedor">


    <div class="display-flex">
        <div class="celda">
            Calle:
        </div>
        <div class="valor">
            {direccion.calle}
        </div>
    </div>
    <div class="display-flex">
        <div class="celda">
            # exterior:
        </div>
        <div class="valor">
            {direccion.numero_exterior}
        </div>
    </div>
    {#if direccion.numero_interior!=""}         
        <div class="display-flex">
            <div class="celda">
                # interior:
            </div>
            <div class="valor">
                {direccion.numero_interior}
            </div>
        </div>
    {/if}      
    <div class="display-flex">
        <div class="celda">
            Colonia:
        </div>
        <div class="valor">
            {direccion.colonia}
        </div>
    </div>   
    <div class="display-flex">
        <div class="celda">
            Municipio:
        </div>
        <div class="valor">
            {direccion.municipio}
        </div>
    </div>
    <div class="display-flex">
        <div class="celda">
            Estado:
        </div>
        <div class="valor">
            {direccion.estado}
        </div>
    </div>
    <div class="display-flex">
        <div class="celda">
            C.P.
        </div>
        <div class="valor">
            {direccion.pais}
        </div>
    </div>

</div>