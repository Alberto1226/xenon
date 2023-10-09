<script>
import {onMount} from "svelte" ;
import {goto} from "@sapper/app" ;

onMount(()=>{
    setTimeout(() => {
        goto("app/productos")
    }, 250);
})
</script>