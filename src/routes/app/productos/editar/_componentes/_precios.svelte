<script>
  export var precio_publico = 0;
  import { formato_precio } from "./../../../../stores";

  const lista_descuentos = [
    0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
    51, 52, 53, 54, 55, 56, 57, 58, 59, 60
  ];

  let indice_descuento = 0;
  $: descuento_seleccionado = lista_descuentos[indice_descuento] || 0;
  $: precio_con_descuento = (Number(precio_publico) || 0) * (1 - descuento_seleccionado / 100);
</script>

<style>
  .control-descuento {
    padding: 14px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
  }

  .resumen-descuento {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .etiqueta-descuento {
    color: #475569;
    font-size: 13px;
    font-weight: 600;
  }

  .valor-descuento {
    display: inline-block;
    margin-left: 8px;
    padding: 4px 10px;
    border-radius: 999px;
    background: #0284c7;
    color: white;
    font-size: 13px;
    font-weight: 700;
  }

  .precio-final {
    color: #0f172a;
    font-size: 18px;
    font-weight: 700;
    white-space: nowrap;
  }

  .barra-descuento {
    width: 100%;
    margin: 2px 0 0;
    accent-color: #0284c7;
    cursor: pointer;
  }

  .marcas-descuento {
    display: flex;
    justify-content: space-between;
    margin-top: 4px;
    color: #64748b;
    font-size: 11px;
  }

  .ayuda-descuento {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 11px;
  }

  @media (max-width: 500px) {
    .resumen-descuento {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>

<div class="control-descuento">
  <div class="resumen-descuento">
    <div class="etiqueta-descuento">
      Descuento
      <span class="valor-descuento">{descuento_seleccionado}%</span>
    </div>
    <div class="precio-final">
      Precio con descuento: $ {formato_precio(precio_con_descuento)}
    </div>
  </div>
  <input
    class="barra-descuento"
    type="range"
    min="0"
    max={lista_descuentos.length - 1}
    step="1"
    bind:value={indice_descuento}
    aria-label="Porcentaje de descuento"
    aria-valuetext="{descuento_seleccionado}% de descuento"
  />
  <div class="marcas-descuento">
    <span>0%</span>
    <span>50%</span>
    <span>60%</span>
  </div>
  <p class="ayuda-descuento">De 0% a 50% avanza de 5 en 5; después, de 1 en 1.</p>
</div>
