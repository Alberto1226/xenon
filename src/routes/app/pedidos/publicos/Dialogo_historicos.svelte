 <script>
export var visible_tipo_pedidos_visible	=false;
export var viendo = 'Pendientes';
import {Dialog,Button} from 'svelte-mui/src';

export var obtener_carritos =  false;
</script>
			
<style>
			
</style> 

<Dialog width="480" bind:visible={visible_tipo_pedidos_visible}>
  <div class="centrado">Opciones de vista</div>

  <table>
    <tr>
      <td>
        <Button
          on:click={() => {
            //pagina_actual = 1;
            viendo = 'Pendientes';
            obtener_carritos = true;
          }}>
          <i class="material-icons">timer</i>
          Pendientes
        </Button>
      </td>
      <td>
        <Button
          on:click={() => {
            //  pagina_actual = 1;
            viendo = 'Historicos';
            obtener_carritos = true;
          }}>
          <i class="material-icons">flight_land</i>
          Históricos
        </Button>
      </td>
    </tr>
  </table>

  <div slot="actions" class="actions center" />

  <div slot="footer" class="footer" />
</Dialog>
