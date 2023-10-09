<script>
  import Archivo from "./Archivo.svelte";
  import { lista_archivos_uploads } from "./stores_admon";
  export var lista = [];
  export var multiple = true;

  var archivos = [];
  var files = [];
  var dragging = false;

  /*
  function handleChange(e) {
    files = Array.from(e.target.files);
    var input = document.getElementById("imgfile");
   //console.log(input.files[0]);
    var file = files[0];
    var fr = new FileReader();
    fr.onload = () => {
      var img = new Image();
      //img.onload = imageLoaded();

      img.src = fr.result;
      document.body.appendChild(img);
    };
    fr.readAsDataURL(input.files[0]);

    var file2 = files[1];
    var fr2 = new FileReader();
    fr2.onload = () => {
      var img2 = new Image();
      //img.onload = imageLoaded();

      img2.src = fr2.result;
      document.body.appendChild(img2);
    };
    fr2.readAsDataURL(input.files[1]);
  }*/
  function handleChange2(e) {
    var files = Array.from(e.target.files);
    var input = document.getElementById("imgfile");
    var i = 0;
    const element = files[i];
   //console.log(input.files[i]);
   //console.log(i);

    var file = files[i];
    var fr = new FileReader();
    fr.onload = () => {
      var img = new Image();
      //img.onload = imageLoaded();
      img.src = fr.result;
      //document.body.appendChild(img);
      $lista_archivos_uploads.push({
        name: file.name,
        size: file.size,
        base64: img.src
      });
      $lista_archivos_uploads = $lista_archivos_uploads;
     //console.log($lista_archivos_uploads);
    };
    fr.readAsDataURL(input.files[i]);
  }

  function drag(evt) {
   //console.log(evt);

  }

  function dragend(evt) {
    dragging = false;
  }

  function drag_enter(evt) {
    //console.log("se entro en modo drag");
    dragging = true;
  }
  function drag_leave(evt) {
    //console.log("se entro en modo drag");
    dragging = false;
    //console.log("asdas");
    
  }
   function drop(evt) {
    //console.log("se entro en modo drag");
    dragging = false;
    //console.log("asdas");
    
  }
  /*
  function loadImage() {
    // //console.log(file);
    var input, file, fr, img, archivo;

    if (typeof window.FileReader !== "function") {
      write("The file API isn't supported on this browser yet.");
      return;
    }

    input = document.getElementById("imgfile");
   //console.log(input.files[0]);
    if (!input) {
      write("Um, couldn't find the imgfile element.");
    } else if (!input.files) {
      write(
        "This browser doesn't seem to support the `files` property of file inputs."
      );
    } else if (!input.files[0]) {
      write("Please select a file before clicking 'Load'");
    } else {
      files = input.files;
     //console.log(files);
      file = files[0];
      fr = new FileReader();
      fr.onload = createImage();
      fr.readAsDataURL(input.files[0]);

      
            for (let index = 0; index  < files.length ; index++) {
                //const element = files[index];
               //console.log(index);
                file = files.item(0)
               //console.log(file);
                fr = new FileReader();
                fr.onload = createImage(index);
                fr.readAsDataURL(file);
            
    }

    function createImage() {
      img = new Image();
      //img.onload = imageLoaded();

      img.src = fr.result;
      document.body.appendChild(img);
    }

    function imageLoaded() {
      var canvas = document.getElementById("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      alert(canvas.toDataURL("image/jpeg"));
    }

    function write(msg) {
      var p = document.createElement("p");
      p.innerHTML = msg;
      document.body.appendChild(p);
    }
  }*/
</script>

<style>
  .custom-file-input::-webkit-file-upload-button {
    visibility: hidden;
  }
  .custom-file-input::before {
    content: "Select some files";
    display: inline-block;
    background: linear-gradient(top, #f9f9f9, #e3e3e3);
    border: 1px solid #999;
    border-radius: 3px;
    padding: 5px 8px;
    outline: none;
    white-space: nowrap;
    -webkit-user-select: none;
    cursor: pointer;
    text-shadow: 1px 1px #fff;
    font-weight: 700;
    font-size: 10pt;
  }
  .custom-file-input:hover::before {
    border-color: black;
  }
  .custom-file-input:active::before {
    background: -webkit-linear-gradient(top, #e3e3e3, #f9f9f9);
  }
  .upload-btn-wrapper {
    position: relative;
    overflow: hidden;
    display: inline-block;
  }

  .btn {
    border: 1px solid #3ca1f2;
    color: #3ca1f2;
    background-color: white;
    padding: 8px 20px;
    border-radius: 5px;
    font-size: 17px;
    font-weight: bold;
    margin-top: 19px;
    border-style: dashed;
  }

  .upload-btn-wrapper input[type="file"] {
    font-size: 100px;
    position: absolute;
    left: 0;
    top: 0;
    opacity: 0;
  }
  .dragenter {
    border-radius: 5px;
    padding:5px;
    
    border-style: dashed;
    border-color: blueviolet;
    text-align: center;
    width: 20vw;
    cursor: cell;
  }
  /*th{
  background-color:
blueviolet;
width: 162px;
color:
white;
border-radius: 8px 8px 0px 8px;
padding-top: 3px;
margin-top: 121px;
margin-left: 1px;
font-weight: 300;
}*/
</style>
{#if $lista_archivos_uploads.length>0}
   <div class="centrado">
    
   </div>
{:else}
   <div class="upload-btn-wrapper " class:dragenter={dragging} >
  <button class="btn">Seleccionar archivo</button>
  <input
    id="imgfile"
    type="file"
    name="myfile"
    class="custom-file-input pointer"
    accept="image/png,image/gif,image/jpeg"
    on:change={handleChange2}
    on:drag={drag}
    on:dragenter={drag_enter}
    on:mouseout={drag_leave}
    on:drop={drop}
    ondragend="dragend()" />
</div>
<p>Selecciona las fotosgrafias para el producto</p>
{/if}



<table>

  <tbody>
    <tr>
      {#each $lista_archivos_uploads as file, i}
        <!-- <tr>
        <td>{i})</td>
        <td>{file.name}</td>
        <td>{file.size}</td>
        <td>{file.type}</td>
        <td>
          <img src={file.base64} alt="previsualizacion" class="miniatura" />
        </td>
      </tr> -->
        <Archivo bind:archivo={file} />
      {/each}
    </tr>
  </tbody>
</table>
