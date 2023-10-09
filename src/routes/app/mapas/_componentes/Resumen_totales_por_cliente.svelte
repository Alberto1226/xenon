<script>

import {formato_precio} from './../../../stores';
export let pedidos_en_estado=[];
export let ubicacion;
let total = 0;
$: if(pedidos_en_estado.length>0){
    total = total_reducir();
    //console.log(total);
    
}
$: if(pedidos_en_estado.length==0){
    total = 0;
    //console.log(total);
    
}

function total_reducir() {
   //console.log(pedidos_en_estado);
    pedidos_en_estado.forEach(element => {
       //console.log(element.total_ventas_cliente);
        
    });
    let reducer = (a,b)=>a + +b.total_ventas_cliente;
    return pedidos_en_estado.reduce(reducer,0)
}


/*_id: "$cliente.nombre",
            count: { $sum: 1 },
            total_ventas_cliente: { $sum: "$total_pedido" },
            lista_pedidos: { $push: { id: "$_id", cliente: "$cliente.nombre", fecha: "$fecha",total_pedido:"$total_pedido" } }*/
</script>
<style>
.grid-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  grid-template-areas: "total total" "izq derecha";
}

.total { grid-area: total; }

.izq { grid-area: izq; }

.derecha { grid-area: derecha; }
.total_numero{
    font-size: 2em;
    font-weight: 500;
    color:rgb(5, 89, 199);
}
</style>

<div class="grid-container">
  <div class="total">
  <table><tr>
      <td>
      <span class="indice_row">Total ventas en {ubicacion}</span> <br>
      <span class="total_numero">$ {formato_precio(total)}</span>
      </td>
  </tr></table>
  
  </div>
  <div class="izq"></div>
  <div class="derecha"></div>
</div>