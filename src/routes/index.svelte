<script>
import {goto} from "@sapper/app";
import {Button} from "svelte-mui/src";

const catalogo = ()=>{
	goto("publico/catalogo");
}
</script>

<style>
	h1,  p {
		text-align: center;
		margin: 0 auto;
	}

	h1 {
		font-size: 2.8em;
		text-transform: uppercase;
		font-weight: 700;
		margin: 0 0 0.5em 0;
	}


	p {
		margin: 1em auto;
	}

	@media (min-width: 480px) {
		h1 {
			font-size: 4em;
		}
	}
</style>

<svelte:head>
	<title>Xenon y más</title>
</svelte:head>

<h1>Xenon y más</h1>


<p><strong>Bienvenid@ a Xenon y más</strong></p>
<div class="centrado">
<a href="/login">login</a>
</div>
