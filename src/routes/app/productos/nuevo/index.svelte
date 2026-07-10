<script>
  // =========================================================================
  // ARCHIVO OBSOLETO - NO UTILIZAR
  // =========================================================================
  // Este archivo frontend de creación de productos ha quedado obsoleto.
  // Toda la interfaz y la lógica de creación y edición de productos ha sido
  // unificada en la siguiente ruta:
  // 
  // RUTA UNIFICADA: src/routes/app/productos/editar/index.svelte
  //
  // Por favor, realiza cualquier modificación visual o lógica directamente
  // en el archivo de la carpeta "editar".
  // =========================================================================
  
  import { onMount } from "svelte";
  import { goto } from "@sapper/app";
  
  onMount(() => {
    // Redirección automática de seguridad por si se accede a esta ruta directamente
    goto("app/productos/editar");
  });
</script>

<div class="centrado" style="padding: 40px; text-align: center; color: #cbd5e1; font-family: sans-serif;">
  <h3>Esta vista ha sido unificada</h3>
  <p>Redirigiendo al formulario de productos unificado...</p>
  <a href="app/productos/editar" style="color: #3b82f6; text-decoration: underline;">Ir al Formulario de Productos</a>
</div>
