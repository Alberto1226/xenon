<script>
    import { Datefield, Button, Dialog, Icon } from "svelte-mui/src";

    export let hasta;

    hasta = new Date();
    let format = "D.MM.YYYY";

    const cambio_fecha = () => {
    // dispatch("cambio_fecha");
    console.log("cambio_fecha");
  };

    let cards = [
        {
            title: "Ventas pedido",
            number: 2,
            color: "blue",
            icon: "bi-cart",
            link: "#",
        },
        {
            title: "Ventas Cancelada",
            number: 2,
            color: "red",
            icon: "bi-x-circle",
            link: "#",
        },
    ];
</script>

<link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.8.1/font/bootstrap-icons.min.css"
/>

<div>
    <div>
        <Datefield
              icon
              bind:value={hasta}
              label="Hastsa"
              {format}
              on:click={cambio_fecha}
              message={format} />
    </div>

    <div>
        // tabla de resultados
        <div class="cards-container">
            {#each cards as card}
                <div class="card {card.color}">
                    <div class="card-header">
                        <span>{card.number}</span>
                        <i class="bi {card.icon} icon"></i>
                    </div>
                    <div class="card-body">
                        <p>{card.title}</p>
                        <a href={card.link} class="info-link">
                            Más Información ➔
                        </a>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
    .card {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border-radius: 10px;
        color: white;
        padding: 10px;
        width: 180px;
        height: 120px;
        margin: 10px;
    }

    .blue {
        background-color: #007bff;
    }

    .red {
        background-color: #dc3545;
    }

    .icon {
        font-size: 3rem;
        opacity: 0.7;
    }

    .info-link {
        color: white;
        text-decoration: none;
    }

    .info-link:hover {
        text-decoration: underline;
    }

    .cards-container {
        display: flex;
        flex-wrap: wrap;
    }
</style>
