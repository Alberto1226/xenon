<script>
  import SvelteInfiniteScroll from "svelte-infinite-scroll";
 export let lista =[];

  let page = 0;
  let size = 20;
  let productos = [];

  $: productos = [
    ...productos,
    ...lista.splice(size * page, size * (page + 1) - 1)
  ];
</script>

<style>
  ul {
    width: 400px;
    max-height: 400px;
    overflow-x: scroll;
  }
</style>

<ul>
  {#each productos as producto,i}
    <li>{i+1}) {producto.nombre}</li>
  {/each}
  <SvelteInfiniteScroll threshold={100} on:loadMore={() => page++} />
</ul>