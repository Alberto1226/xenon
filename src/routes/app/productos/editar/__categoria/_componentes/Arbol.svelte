<script>
    import Padre from './Padre.svelte';
    import {mensajes_app,editar_store} from './../../../../../stores'
    import { seleccionando_padre_nuevo, padre_nuevo,categoria_nuevo_nombre } from "./../store";
    export let categorias=[];

    const handleError = ()=>{
        $mensajes_app.pus({mensaje:'Error al guardar', tipo:'error'})
    }

    const handleGuardado = ()=>{
        $mensajes_app.pus({mensaje:'Guardada', tipo:'exito'})
    }

    
    
</script>

<Padre on:guardado={handleGuardado} on:error_al_guardar={handleError} descripcion="Categorias" children={categorias} expanded/>