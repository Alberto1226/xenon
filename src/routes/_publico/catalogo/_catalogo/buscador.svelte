<script>
import {catalogo} from "./../../../stores";
import {Textfield} from "svelte-mui/src";
</script>
<style>

	.cabecera{
    color: white;
    width: 100%;
    height: 46px;
    background-image: linear-gradient(180deg,#e93838d3 59%,#f7a2a2 100%);
    border-radius: 7px;
  }
  .table{
      text-align:center; 
      border-radius: 8px;
      height: 53px;
      width: 100%;
  }
  .card{
      height: 50%;
      position: relative; 
      background: #ccd6f3; 
      text-align:center; 
      border-radius: 8px;
  }
  .menu{
       width: 100%;
  }
  .item1{
      width: 20%;
  }
  .item2{
      width: 25%;
  }
  .item3{
      width: 20%;
  }
  .item4{
      width: 35%;
  }
</style>

<div class="cabecera">
    <table class="table">
    <tr class="menu">
        <td class="item1">Inicio</td>
        <td class="item2">¿Quienes somos?</td>
        <td class="item3"> Carrito</td>
        <Textfield  outlined bind:value={$catalogo.buscando} type="text"/> <button style="border-radius:8px"> buscar</button>
    </tr>
    </table>
</div>
<!-- <div style="text-align:right">
    <input style="margin-top:1%; border-radius:1px" type="text" bind:value={buscando}> {valor} <button style="border-radius:8px"> buscar</button>
</div> -->




