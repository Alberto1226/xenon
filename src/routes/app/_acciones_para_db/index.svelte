<script>

import {postData} from './../../stores';

import {Dialog, Button ,Textfield}  from "svelte-mui/src";
let visible=false;
let confirmar =""

let opcion =''
$: if(opcion!='')visible =true;

const url_correcto =(opcion)=>{
    switch (opcion) {
        case 'carritos':
            return 'borrar_inicial_carritos'
            break;
    
        case 'pedidos':
            return 'borrar_inicial_pedidos'
            break;
    
        case 'cancelados':
            return 'borrar_inicial_cancelados'
            break;
    
        case 'fichas_descuento':
            return 'borrar_inicial_fichas'
            break;
    
        case 'apartados_productos':
            return 'borrar_inicial_apartados'
            break;
    
        default:
            break;
    }
}

const borrar=()=>{
    if(confirmar!='si borrar')return;
    let url = 'app/acciones_para_db/'+url_correcto(opcion);
    postData(url).then((res)=>{
        console.log(res)
        confirmar = "";
    })
}

</script>

Borrar todos los pedidos pendientes (carritos en db)

<button on:click={()=>opcion='carritos'} >borrar</button>

<hr>


Borrar todos los pedidos historicos
<button on:click={()=>opcion='pedidos'} >borrar</button>




<hr>


Borrar todos los pedidos cancelados

<button on:click={()=>opcion='cancelados'} >borrar</button>




<hr>


Borrar todas las fichas de descuento
<button on:click={()=>opcion='fichas_descuento'} >borrar</button>



<hr>


Borrar apartados en productos
<button on:click={()=>opcion='apartados_productos'} >borrar</button>




<Dialog width="400" bind:visible>
    <div slot="title"> Cuidado !</div>

<Textfield 
        label="confirmacion (si borrar)"
        required
        message="escribe: si borrar" type="text" bind:value={confirmar}/>
 
   

    <div slot="actions" class="actions center">
    <div class="centrado">
    Borrar collecion <b style="color:red;font-size:2em;">{opcion}</b> de DB 
    </div>
        <Button raised color="red" title="Click para borrar {opcion}"  on:click={borrar} >Borrar <i class="material-icons">delete</i></Button>
    </div>

    <div slot="footer" class="footer">
       
        <a style="color:darkorange" href="#!" on:click={()=>visible = false} class="centrado">Cancelar</a>
    </div>
</Dialog>