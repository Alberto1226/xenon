<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  import { mensajes_app, productos, postData } from "./../../../../stores";
  import { onMount } from "svelte";
  export var unidad;

  let unidades = [];
  var lista_visible = true;
  onMount(() => {
    getColeccion();
  });

  function getColeccion() {
    return new Promise((resolve, reject) => {
      postData("app/productos/catalogoConsulta", {
        tipo: "consulta",
      }).then((res) => {
        if (res.ok && res.catalogos.length != 0) {
          // if (res.catalogos.Marcas.length != 0) {
          //   marcas = res.catalogos.Marcas.sort((a, b) => a.localeCompare(b));
          //   // console.log(marcas);
          //   lista = marcas;
          // }
          if (res.catalogos.Unidades.length != 0) {
            unidades = res.catalogos.Unidades.sort((a, b) =>
              a.localeCompare(b),
            );
          }
          // if (res.catalogos.Cuentas.length != 0) {
          //     cuentas = res.catalogos.Cuentas;
          // }
          resolve(res.ok);
        }
        if (res.ok && res.catalogos.length == 0) {
          // idRegistro = "SinDatos";
          resolve(res.ok);
        }
      });
    });
  }
</script>

{#if lista_visible}
  <!-- content here -->

  <Menu origin="top left" style="width:250px;">
    <div slot="activator">
      <Button
        color={unidad == "" ? "red" : "primary"}
        raised
        ripple={false}
        style="padding:4px;width:100%;height:67px;"
      >
        <i class="material-icons vertical-alineado icono_peque">
          arrow_drop_down
        </i>

        <span>Unidad : {unidad == "" ? "pendiente..." : unidad}</span>
      </Button>
    </div>
    <div class="scrollable">
      {#each unidades as item}
        <!-- content here -->

        <Menuitem
          on:click={() => {
            unidad = item;
          }}
        >
          {item}
        </Menuitem>
      {/each}
    </div>
    <!-- 
  <hr />
  <Menuitem  on:click={() => {
       lista_visible =false;
      }}>otra...</Menuitem> -->
  </Menu>
{:else}
  <!-- else content here -->
  <table>
    <tr>
      <td
        ><Textfield
          bind:value={unidad}
          placeholder="Unidad personalizada"
          message="Unidad personalizada"
        />
      </td>
      <td
        ><Button
          raised
          on:click={() => {
            lista_visible = true;
          }}
        >
          lista
        </Button></td
      >
    </tr>
  </table>
{/if}

<style>
  .scrollable {
    overflow-y: auto;
    height: 150px;
    width: 250px;
  }
</style>
