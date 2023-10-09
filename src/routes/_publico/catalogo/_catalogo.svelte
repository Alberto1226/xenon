<script>
  import Card from "./_catalogo/Card.svelte";
  import { productos, catalogo, postData } from "../../stores";
  import { onMount } from "svelte";

  onMount(() => {
    if ($productos.lista.length > 0) return;
    obtener_productos_por_pagina();
  });

  function obtener_productos_por_pagina() {
    if ($catalogo.http_ocupado) return;
    $catalogo.http_ocupado = true;
    postData("publico/productos/lista_de_productos", {
      buscando: $catalogo.buscando,
      pagina_actual: $catalogo.pagina_actual
    })
      .then(async res => {
        setTimeout(() => {
          //console.log(res);
          $catalogo.http_ocupado = false;
        }, 200);
        if (res.ok) {
          $productos.lista = res.lista;
          $productos.lista_actualizada = new Date(); //  cuando se actualizo la lista completa por ultima vez
          $productos = $productos;
          //lista = $productos.lista;
          $catalogo.total_paginas = res.paginas;
          if ($catalogo.buscando === "") {
            //total_registros = res.numero_total;
            $catalogo.total_registros = res.numero_total;
          } else {
            $catalogo.coincidencias = res.coincidencias;
          }
        }
      })
      .catch(err => {
        console.log(err);
        $catalogo.http_ocupado = false;
      });
  }

  let array = [
    {
      producto: {
        titulo: "Spectra Premium Radiador B2094",
        detalles:
          "Número de refacción: B2094 <br> Peso: 13.00lb  <br> Tank Material: Plástico",
        contenido:
          "Todos los radiadores se someten a pruebas de envejecimiento y resistencia con el fin de validar su rendimiento bajo condiciones climáticas extremas Fabricado con celdas de alta densidad de múltiples laminillas para una máxima eficiencia de enfriamiento Fabricado bajo estrictas tolerancias, diseñado por nuestro propio equipo de ingeniería que tiene conocimiento a profundidad de la parte de OE a la que está diseñado para reemplazar El empaque y los o-rings se someten a un choque térmico para asegurar su durabilidad en clima extremadamente frío Instrucciones de instalación provistas en la caja"
      }
    },
    {
      producto: {
        titulo: "Castrol Sint Aceite de Motor",
        detalles:
          "Número de refacción: 1598B1 <br> Ubicación: Engine Oil <br> Peso: 9.47lb",
        contenido:
          "Los avances en la tecnología de motores han dado como resultado mayor potencia y eficacia, lo que significa que los motores trabajan más duro y bajo presiones más altas que nunca antes. Lo único que mantiene los componentes del motor separados es el aceite, así que necesita ser fuerte y permanecer fuerte. Castrol EDGE es nuestro rango más fuerte y avanzado de aceites sintéticos para motor. "
      }
    },
    {
      producto: {
        titulo: "Duralast Gold Balata Ceramica DG866",
        detalles:
          "Número de refacción: DG866 <br> Ubicación: Front <br> Peso: 3.85lb <br> Garantía: 1 año <br> Notas: Cerámica",
        contenido:
          "Las balatas Duralast Gold se diseñan para ser reemplazo directo de las balatas originales de su auto. La meta de cada trabajo de frenos es regresar al sistema de frenos a su condición de operación original. Usar balatas Duralast Gold es el primer paso para completar esa meta. Balatas de cerámica Duralast Gold para una conducción más silenciosa y con una generación de polvo de frenos ultrabaja. Imagen representativa del producto."
      }
    },
    {
      producto: {
        titulo: "Duralast Bomba de Direccion Hidraulica 5872",
        detalles:
          "Número de refacción:	5872 <br> Peso: 5.00lb <br> Garantía: 1 año",
        contenido:
          "Cada unidad se prueba e inspecciona para asegurar que cumple o excede las especificaciones del equipo original. Todos los componentes se inspeccionan al 100% usando equipo de medición calibrado para después remanufacturarlos o reemplazarlos con nuevos. Esto garantiza que la unidad terminada siempre cumplirá o excederá las expectativas de nuestros clientes."
      }
    }
  ];

  //let nombre = "Raf full";
</script>

<style>
  .catalogo {
    display: flex;
    flex-wrap: wrap;
    background-image: url(imagenes/header_tienda_online.png);
    background-blend-mode: overlay;
    background-color: #e2e2e2;   
    
  }
</style>

<div>

  <div class="catalogo">

    {#each $productos.lista as item}
      <!-- content here -->
      <Card {...item} producto={item}/>
    {:else}
      <!-- empty list -->
      esta vacio
    {/each}

  </div>
</div>
