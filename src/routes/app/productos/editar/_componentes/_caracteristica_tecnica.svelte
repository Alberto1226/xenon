<script>
export var indice;
export var caracteristica;
import {Button} from "svelte-mui/src"
import {createEventDispatcher} from "svelte"
const dispatch = createEventDispatcher();

function borrar() {
    dispatch("borrar",{indice})
}

</script>
<style>

.grid-container {
  display: grid;
  grid-template-columns: 0.2fr 2.5fr 0.3fr;
  grid-template-rows: 1fr;
  grid-template-areas: "uno dos tres";
}

.uno { grid-area: uno; }

.dos { grid-area: dos; }

.tres { grid-area: tres; }

</style>

<div class="grid-container">
  <div class="uno indice_row">{indice}</div>
  <div class="dos caracteristica">{caracteristica}</div>
  <div class="tres"><Button on:click={borrar} icon> <i class="material-icons">delete</i> </Button> </div>
</div>

