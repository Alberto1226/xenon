<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  export var rol;

  var roles = ["administrador", "gerente", "vendedor", "almacen", "diseñador", "ComercioExterior"];
  var lista_visible = true;
</script>

<!-- content here -->

<Menu origin="top left" style="width:250px;">
  <div slot="activator">
    <Button
      color={rol == "" ? "red" : "primary"}
      raised
      ripple={false}
      style="padding-right: 4px;width:100%;"
    >
      <i class="material-icons vertical-alineado icono_peque">
        arrow_drop_down
      </i>

      <span>rol : {rol == "" ? "pendiente..." : rol}</span>
    </Button>
  </div>
  <div class="scrollable">
    {#each roles as item}
      <!-- content here -->

      <Menuitem
        on:click={() => {
          rol = item;
        }}
      >
        {item}
      </Menuitem>
    {/each}
  </div>
</Menu>

<style>
  .scrollable {
    overflow-y: auto;
    height: 150px;
    width: 350px;
  }
</style>
