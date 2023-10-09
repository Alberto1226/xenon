
<script>
import {Button} from "svelte-mui/src";
import {productos,catalogo} from '../../stores';
const siguiente = () =>{
    if($catalogo.total_paginas == $catalogo.pagina_actual+1)return;
    $catalogo.pagina_actual ++
}


const anterior = () =>{
    if($catalogo.pagina_actual=== 1)return;
    $catalogo.pagina_actual --;
}
</script>
<div style="width: 100%; position: absolute;bottom: 30px;">
  <table style="width:100%;">

    <tr>
   
      <td>
        <div class="centrado " style="width: 200px;margin: 0 auto;">

          <Button
            disabled={$catalogo.pagina_actual == 1 || $catalogo.http_ocupado}
            on:click={anterior}>
            <i class="material-icons">keyboard_arrow_left</i>
          </Button>
          {$catalogo.pagina_actual} / {$catalogo.total_paginas}
          <Button
            disabled={$catalogo.pagina_actual == $catalogo.total_paginas || $catalogo.http_ocupado}
            on:click={siguiente}>
            <i class="material-icons">keyboard_arrow_right</i>
          </Button>

        </div>

      </td>

      <td class="paginado_cometarios">
        Productos : {$catalogo.total_registros}
        <br />
        {#if $catalogo.buscando != ''}
          <!-- content here -->
          Coincidencias {$catalogo.coincidencias}
        {/if}
      </td>
    </tr>
  </table>
</div>