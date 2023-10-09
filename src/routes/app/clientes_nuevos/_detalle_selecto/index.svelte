<script>
    import {
        solicitud_selecta,
        viendo_lista_solicitudes,
        viendo_detalles_de_solicitud,
        crear_nuevo,
        recargar_lista
    } from "../_lista/store";
    import {buscadores} from './../../../stores';
    import { Button } from "svelte-mui/src";
    import { fly } from "svelte/transition";
    import Direccion from "./direccion_detalle.svelte";
    import Cliente from "./datos_personales.svelte";
    import Agente from "./Agente_ventas.svelte";
    import Perfil from "./Perfil.svelte";
    import Region from "./Region.svelte";
    import Borrar from "./borrar.svelte";
    import {goto} from '@sapper/app';

    var viendo_cliente = true;
    var completo = false;
    var http_ocupado = false;
    var perfil = {
        mostrar: "Público en general",
        perfil: "Público en general",
        porcentaje: 0,
    };
    var agente = {
        nombre: "",
        id: "",
    };
    var guardado = false;
    var region ="";

    $: if (agente.nombre != "" && region!="") {
        completo = true;
    }

    function ir_a_clientes() {
        $buscadores.clientes = $solicitud_selecta.nombre;
        goto("app/clientes");
    }

    async function guardar() {
        if (completo == false) {
            alert("Selecciona al agente primero");
            return;
        }
        if (http_ocupado == true) return;
        http_ocupado = true;
        const proceso_guardar = await crear_nuevo({
            agente,
            perfil,
            cliente_nuevo_id: $solicitud_selecta._id,
            region
        });

        if(proceso_guardar.ok ==true){
            $recargar_lista = true;
            setTimeout(()=>{
                $viendo_lista_solicitudes = true;
                $viendo_detalles_de_solicitud = false;
            },100)
        }
        console.log(proceso_guardar);
        http_ocupado = false;
    }

    function toggle() {
        viendo_cliente = !viendo_cliente;
    }

    function regresar() {
        $viendo_detalles_de_solicitud = false;
        $viendo_lista_solicitudes = true;
    }
</script>

<style>
    .blanco{
        color:white;
        font-size: 2.2em;
    }
    .barra-superior {
        height: 100px;
        background: #222d32;
        color: white;
    }

    .contenedor {
        height: 80vh;
    }

    .margen-top {
        margin-top: 20px;
    }

    .controles {
        padding: 10px;
        border: 1px solid gray;
        border-radius: 15px;
        margin: 15px 3vw 0 3vw;
    }

    .control_guardar_div {
        width: fit-content;
        margin-left: auto;
    }
</style>

<div
    class="contenedor"
    in:fly={{ duration: 200, x: 500 }}
    out:fly={{ duration: 200, x: 500 }}>
    <div class="barra-superior display-flex">
        <div class="margen_vert_auto">
            <Button icon dense title="Regresar a la lista" on:click={regresar}>
                <i class="material-icons blanco">arrow_back</i>
            </Button>
        </div>
        <h3 class="centrado">Solicitud para ser distribuidor</h3>
    </div>

    <div class="centrado">
        <Button on:click={toggle} dense>
            cambiar vista
            <i class="material-icons"> sync_alt </i>
        </Button>
    </div>
    <div class="">
        <div>
            {#if viendo_cliente == true}
                <Cliente
                    nombre={$solicitud_selecta.nombre}
                    correo={$solicitud_selecta.correo}
                    telefono={$solicitud_selecta.telefono}
                    createdAt={$solicitud_selecta.createdAt}
                    fecha_nacimiento={$solicitud_selecta.fecha_nacimiento} />
            {:else}
                <Direccion
                    direccion={$solicitud_selecta.direcciones_asociadas[0]} />
            {/if}
        </div>
    </div>

    <div class="controles">
        <Borrar/> 
    </div>
    {#if guardado ==false}
    <div class="controles">
        <div class="width-auto-centrado-horizontal margen-top">
            <Agente bind:agente />
        </div>

        <div class="width-auto-centrado-horizontal margen-top">
            <Perfil bind:perfil />
        </div>

        <div class="width-auto-centrado-horizontal margen-top">
            <Region bind:region />
        </div>
        <div class="control_guardar_div">
            <Button
                color={completo == true ? 'primary' : ''}
                disabled={completo == true ? false : true}
                raised={completo==true?true:false}
                on:click={guardar}>
                Guardar
                <i class="material-icons">save</i>
            </Button>
        </div>
    </div>
    {:else}
         <h3 class="centrado">
         Ahora podras encontrar al cliente nuevo <b>{$solicitud_selecta.nombre}</b> en la lista de <Button dense on:click={ir_a_clientes}>
            clientes
         </Button>
         </h3>
    {/if}
    
</div>

<!-- 
export const formulario = writable({
    nombre:'nombre',
    correo:'correo@hotm.com',
    fecha:'',
    telefono:'442136522',
    password:'123456789',
    password2:'123456789',
    calle:'calle tal ',
    entre_calle:"entre calle",
    y_calle:"y calle",
    no_ext:'no exteriro',
    no_int:'no interior',
    colonia:'colo',
    localidad:'local lidad',
    municipio:'Asientos',
    estado:'Aguascalientes',
    cp:'',
    paso_1_ok:false,
    paso_2_ok:false,
    actualizar_municipio:true,
    token:""
}) -->
