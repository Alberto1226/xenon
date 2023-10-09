<script>
    var contenedor, dragueable;
    var active = false;
    var currentX;
    var currentY;
    var initialX;
    var initialY;
    var xOffset = 0;
    var yOffset = 0;

    function dragStart(e) {
        if (e.type === "touchstart") {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }

        if (e.target === dragueable) {
            active = true;
        }
    }

    function drag(e) {
        if (active) {
            e.preventDefault();

            if (e.type === "touchmove") {
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
            } else {
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
            }

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, dragueable);
        }
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = "translate3d(" + xPos + "px, " + yPos + "px, 0)";
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;

        active = false;
    }
</script>

<div
    bind:this={contenedor}
    class="contenedor"
    on:dragstart={dragStart}
    on:mousemove={drag}
    on:mouseup={dragEnd}
>
    <div class="dragueable" bind:this={dragueable} />
</div>

<style>
    .contenedor {
        background: black;
        width: 100vw;
        height: 50px;
    }
    .dragueable {
        cursor: pointer;
        background: white;
        width: 50px;
        height: 50px;
    }
</style>
