


<script>
  import { Tabs, Tab, TabList, TabPanel } from "svelte-tabs";
  import Pancake from "./Pancake.svelte";
  import { Button, Ripple } from "svelte-mui/src";
  import { goto } from "@sapper/app";
  import { scale } from "svelte/transition";
  export let url ="";
  export let titulo ="";
  export let tipo ="";
  export let img="";
</script>

<style>
  .imagen_grafico {
    height: 250px;
    border-radius: 5px;
    max-width: 392px;
  }
  .tarjeta {
    background: white;
    padding: 20px;
    width: 397px;
    margin: 25px;
    border-radius: 2px;
  }
  .tarjeta:hover {
    box-shadow: 0 0 10px gray;
  }
</style>

<div
  class="tarjeta pointer"
  in:scale={{ duration: 200, delay: 400 }}
  on:click={() => {
    goto(url);
  }}>
  <table>
    <tr>
      <td>
        <img class="imagen_grafico" src={img} alt="Pancake" />

      </td>
    </tr>
    <tr>

      <td class="centrado">
        <Button>{titulo}</Button>
      </td>
    </tr>
    <tr>
        
      <td>
        <span class="indice_row">{tipo}</span>
      </td>
    </tr>
    <Ripple />
  </table>

</div>