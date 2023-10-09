<script>

  import { BarLoader } from "svelte-loading-spinners";
  export let size=60;
  export let color ="#222d32";
</script>

<!-- CARGANDO -->
  <div class="centrado" style={`color:${color}`}>
    Cargando ...
   <div style="padding-left: calc(50% - 62px);">
    <BarLoader size={size} color={color} unit="px" />
   </div>
  </div>