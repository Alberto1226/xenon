<script>

    export var direccion={};
</script>
<style>
    .display-flex{
        display:flex;
    }
</style>

<div class="display-flex">
        <div>
            Calle:
        </div>
        <div>
            {direccion.calle}
        </div>
    </div>
    <div class="display-flex">
        <div>
            # exterior:
        </div>
        <div>
            {direccion.numero_exterior}
        </div>
    </div>
    {#if direccion.numero_interior!=""}         
        <div class="display-flex">
            <div>
                # interior:
            </div>
            <div>
                {direccion.numero_interior}
            </div>
        </div>
    {/if}      
    <div class="display-flex">
        <div>
            Colonia:
        </div>
        <div>
            {direccion.colonia}
        </div>
    </div>   
    <div class="display-flex">
        <div>
            Municipio:
        </div>
        <div>
            {direccion.municipio}
        </div>
    </div>
    <div class="display-flex">
        <div>
            Estado:
        </div>
        <div>
            {direccion.estado}
        </div>
    </div>
    <div class="display-flex">
        <div>
            C.P.
        </div>
        <div>
            {direccion.pais}
        </div>
    </div>