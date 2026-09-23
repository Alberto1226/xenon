<script>
  import { onMount } from "svelte";
  import { goto } from "@sapper/app";

  onMount(() => {
    goto("/app/dev_tools/correccion_relaciones");
  });
</script>

<div class="p-5 text-center text-muted">
  <p>Redirigiendo a <strong>Dev Tools / Corrección de Relaciones</strong>...</p>
</div>
