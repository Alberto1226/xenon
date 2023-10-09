<script>
    import { fade } from "svelte/transition";
</script>

<div in:fade={{ duration: 250 }}>
    <div class="load-3">
        <div class="line" />
        <div class="line" />
        <div class="line" />
    </div>
</div>

<style>
    /* -----------------------------------------
  =Default css to make the demo more pretty
-------------------------------------------- */

    .line {
        display: inline-block;
        width: 15px;
        height: 15px;
        border-radius: 15px;
        background-color: white;
    }
    .load-3 {
        background: none;
        width: 100%;
    }

    .load-3 .line:nth-last-child(1) {
        animation: loadingC 0.6s 0.1s linear infinite;
    }
    .load-3 .line:nth-last-child(2) {
        animation: loadingC 0.6s 0.2s linear infinite;
    }
    .load-3 .line:nth-last-child(3) {
        animation: loadingC 0.6s 0.3s linear infinite;
    }

    @keyframes loadingA {
        0% {
            height: 15px;
        }
        50% {
            height: 35px;
        }
        100% {
            height: 15px;
        }
    }

    @keyframes loadingB {
        0% {
            width: 15px;
        }
        50% {
            width: 35px;
        }
        100% {
            width: 15px;
        }
    }

    @keyframes loadingC {
        0% {
            transform: translate(0, 0);
        }
        50% {
            transform: translate(0, 15px);
        }
        100% {
            transform: translate(0, 0);
        }
    }

    @keyframes loadingD {
        0% {
            transform: rotate(0deg);
        }
        50% {
            transform: rotate(180deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    @keyframes loadingE {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    @keyframes loadingF {
        0% {
            opacity: 0;
        }
        100% {
            opacity: 1;
        }
    }

    @keyframes loadingG {
        0% {
            transform: translate(0, 0) rotate(0deg);
        }
        50% {
            transform: translate(70px, 0) rotate(360deg);
        }
        100% {
            transform: translate(0, 0) rotate(0deg);
        }
    }

    @keyframes loadingH {
        0% {
            width: 15px;
        }
        50% {
            width: 35px;
            padding: 4px;
        }
        100% {
            width: 15px;
        }
    }

    @keyframes loadingI {
        100% {
            transform: rotate(360deg);
        }
    }

    @keyframes bounce {
        0%,
        100% {
            transform: scale(0);
        }
        50% {
            transform: scale(1);
        }
    }

    @keyframes loadingJ {
        0%,
        100% {
            transform: translate(0, 0);
        }

        50% {
            transform: translate(80px, 0);
            background-color: #f5634a;
            width: 25px;
        }
    }
</style>
