<script>
export var pagina_actual=1
export var paginas=1


function aumentar() {
    if(paginas==pagina_actual)return;
    pagina_actual++;
}

function disminuir() {
    if(paginas==1)return;
    pagginas--;
}
</script>

<style>

.input{
    height: 24px;
    width:90px;
}
.boton{
    background: white;
    width: 24px;
    height: 24px;
    padding-top: 3px;
}
</style>

<div class="display-flex" title="Pagina">
    <div  class=" centrado" on:click={aumentar} >
     <button class="boton centrado" disabled={paginas==pagina_actual}>+
    </button>
    </div>
    <input bind:value={pagina_actual} type="number" max={paginas} min="1" class="input centrado">
    <div class=" centrado" on:click={disminuir}>
    <button class="boton centrado" disabled={paginas==1}>
    -
    </button>
    </div>
</div>
