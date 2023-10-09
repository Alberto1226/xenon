<script>
    import { onMount } from "svelte";
    export var fecha;
    export var cumple = false;
    var visible = true;
    var options = {
        day: "numeric",
        month: "long",

        year: "numeric",
    };
    var diferencia_years = 0;

    onMount(() => {
        if(cumple ==true) {
            var dt1 = new Date();
        var dt2 = new Date(fecha);
        
        diferencia_years = diff_years(dt1, dt2);
        //console.log(dt1,dt2,diferencia_years);
        }
        
    });

    function diff_years(dt2, dt1) {
        var diff = (dt2.getTime() - dt1.getTime()) / 1000;
        diff /= 60 * 60 * 24;
        return Math.abs(Math.round(diff / 365.25));
    }

    function toggle() {
        visible = !visible;
    }

    const convertir_a_fecha_humana = (date) => {
        // Make a respuesta time
        if (typeof date === "string") {
            date = new Date(date);
        }
        var delta = Math.round((+new Date() - date) / 1000);

        var minute = 60,
            hour = minute * 60,
            day = hour * 24,
            week = day * 7;

        var respuesta;

        if (delta < 30) {
            respuesta = "Apenas.";
        } else if (delta < minute) {
            respuesta = "Hace " + delta + " segundos.";
        } else if (delta < 2 * minute) {
            respuesta = "Hace un minuto.";
        } else if (delta < hour) {
            respuesta = "Hace " + Math.floor(delta / minute) + " minutos.";
        } else if (Math.floor(delta / hour) == 1) {
            respuesta = "Hace 1  hora.";
        } else if (delta < day) {
            respuesta = Math.floor(delta / hour) + " horas atrás.";
        } else if (delta < day * 2) {
            respuesta = " Ayer";
        } else {
            respuesta = date.toLocaleDateString("es-MX");
        }

        return respuesta;
    };
</script>

<style>
    .fecha:hover {
        font-weight: 700;
    }
</style>

{#if cumple == false}
    <!-- No ES CUMPLE -->
    <div class="fecha pointer display-flex" on:click={toggle}>
        <i class="material-icons vertical-alineado">calendar_today</i>
        {#if visible == true}
            <!-- default humana -->
            <div>{convertir_a_fecha_humana(fecha)}</div>
        {:else}
            <div>{new Date(fecha).toLocaleDateString('es-MX', options)}</div>
        {/if}
    </div>
{:else}
    <!-- ES CUMPLE -->

    <div class="fecha pointer display-flex" on:click={toggle}>
        <i class="material-icons  vertical-alineado">cake</i>
        {#if visible == true}
            <!-- default humana -->
    <div>{diferencia_years} años</div>
        {:else}
            <div>{new Date(fecha).toLocaleDateString('es-MX', options)}</div>
        {/if}
    </div>
{/if}
