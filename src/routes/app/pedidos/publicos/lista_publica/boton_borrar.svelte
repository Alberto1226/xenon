<script>
    import {Button} from 'svelte-mui/src';
    import {mandar_a_historicos,recargar_lista} from '../store';
    export var _id="";
    
    var faltan_confirmaciones = 3;


    function listo_para_mandar() {
        if(faltan_confirmaciones >1){
            faltan_confirmaciones--;
            return false;
        }
        return true
    }

  async function mandar_a_carritos_historicos() {
    if(listo_para_mandar()==false)return;
    if(ocupado==true) return;
    ocupado = true;
    const http = await mandar_a_historicos(_id);
    console.log(http);
    ocupado = false;
    $recargar_lista = true;
  }

</script>


    
    {#if faltan_confirmaciones ==3}
         
        <Button icon dense on:click={mandar_a_carritos_historicos}>
        <i class="material-icons  vertical-alineado">delete</i>
       </Button>
    {:else}
        
    <Button color="red" raised on:click={mandar_a_carritos_historicos}>
        confirma {faltan_confirmaciones} {faltan_confirmaciones>1?"veces":"vez"}
        <i class="material-icons  vertical-alineado">delete</i>
       </Button>
    {/if}