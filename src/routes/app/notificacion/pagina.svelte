<script>
    import {onMount} from 'svelte';
    export var total_paginas = 100;
    export var pagina_actual = 1;
    export var ha_cambiado_pagina_actual =false;
  
    var numero_de_paginas_ofertadas = 10;
    var numero_maximo_de_paginas_ofertadas = 10;
    var lista = [];
    var ancho_enpx =40; // ancho de cada numro
  
    var delta= 0 //   Variable que afectara a inicial y final
    var inicial=1
    var final=10000;
    var x =0;
    var paso_x = 400;
  
    $: if(total_paginas >0){
      llenar_array_lista(total_paginas) ;
    }
  
    onMount(async()=>{
      //final = total_paginas;
      llenar_array_lista(total_paginas)
    })
  
  
    function pagina_selecta(pag) {
      ha_cambiado_pagina_actual = true;
      pagina_actual = pag;
    }
  
  
    function sumar(factor) {
      if(x>0){
        x =0;
        return
      }
       
      x = (paso_x*factor)+x;
      if(x>0){
        x =0;
      }
     // console.log(x);
    }
    
    function restar(factor) {
      var meta =(ancho_enpx*total_paginas*(-1))+(ancho_enpx*10);
      if(x<=meta){
        x=meta;
        return;
      }
      x =x- (paso_x*factor);
      //console.log(x);
    }
  
   function llenar_array_lista(total_paginas) {
     //console.log(total_paginas);
      var lista_tmp =[];
      if(total_paginas==0)return lista;
      for (let i = 1; i <= total_paginas; i++) {
        const element = i;
        //console.log(i);
        lista_tmp.push({num:i,selecta:i==pagina_actual});
        if(i ==total_paginas){
          //    Acaba
          lista= lista_tmp;        
        }
      }
    }
  
  </script>
  
  <style>
  .numero{
    height: 38px;
    width: 38px;
    text-align: center;
    border:1px solid aliceblue;
    
    transition: 50ms bachground-color ease-in ,50ms border-radius ease-in ;
  }
  .numero:hover{
    
    border-radius: 10px;
    border:1px solid rgb(202, 230, 255);
    background: rgb(255, 255, 255);
  }
  
  .numero:active{
    border-radius: 13px;
    color:white;
    border:1px solid rgb(202, 230, 255);
      background: #4400ff87;
  }
  
  .numero_interno{
    padding-top: 10px;
  }
    .selecta{
      border-radius: 7px;
      background:  #40f;;
      color: white;
    }
  
    .selecta:hover{
      background:  rgb(87, 27, 255);
      color: white;
    }
  .lista_externo{
      width:400px;
      overflow-x: hidden;
    }
    .lista_interno{
      width: fit-content;
     transition: 50ms transform ease-in ;
    }
    .ciento-ochenta{
      transform: rotate(180deg);
    }
  </style>
  <div class="display-flex width-auto-centrado-horizontal no_select">
    {#if total_paginas > numero_de_paginas_ofertadas}
    
    <button class="numero pointer"  on:click={()=>{sumar(2)}}>
      <i class="material-icons ciento-ochenta">double_arrow</i>
      </button>
    <button class="numero pointer"  on:click={ ()=>{sumar(1)}}> 
      <i class="material-icons">
        keyboard_arrow_left
      </i>
      </button>
    {/if}
    <div class="lista_externo ">
     
      <div class="lista_interno display-flex" style="transform: translate({x}px, 0px);">
        {#each lista as item}
        
          <div class="numero pointer"  id={"numero_"+item.num} class:selecta={item.num==pagina_actual} on:click={()=>pagina_selecta(item.num)}>
            <div class="numero_interno no_select "  >
              {item.num}
            </div>
          </div>      
        {/each}
      </div>
    </div>
   
  {#if total_paginas > numero_de_paginas_ofertadas}
     
  <button class="numero pointer" on:click={()=>{restar(1)}}>
    <i class="material-icons">
      keyboard_arrow_right
    </i>
  </button>
  <button  class="numero pointer" on:click={()=>{restar(2)}}>
    <i class="material-icons">
    double_arrow
  </i>
  </button>
  {/if}
  
  </div>