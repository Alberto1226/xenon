
<script>
    export let initialValue=0
    export let nombre = 'Usuario';
    function cambiarNombre(){
        nombre = 'Raf full'
    }
    let contador = initialValue
    function contarNumero(){
        contador++
    }
</script>
<style>
	.box {
		width: 300px;
		
		border-radius: 2px;
		box-shadow: 2px 2px 8px rgba(0,0,0,0.1);
		padding: 1em;
		margin: 0 0 1em 0;
        background: white
	}
    h1 {
        color: #09f;
        }
    .box{
        
        width: 33%;
        margin: 3%;
    }
    
</style>

<div style="margin:6px" class="card-body">
    <div class="box">
        <slot></slot>
        <button on:click={cambiarNombre}>Cambiar nombre</button>
        <h1>Buenos dias {nombre} Isotech le da la Bienvenida!!!</h1>
        
    </div>
</div>
<div style="margin:6px" class="card-body">
    <div class="box">
        <slot></slot>
        <button on:click={contarNumero}>Incremento</button>
        <span>{contador}</span>
    </div>
</div>


