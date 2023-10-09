<script>
  import { onMount } from "svelte";
  import { usuario_db, postData,storage } from "./../stores";
  import {goto} from '@sapper/app';

  onMount(() => {
    if ($usuario_db.wtf_descargado == true) return;
    wtfai();
  });

  ///  Regula el status de logueado en el app y guarda los datos del usuario como tipo de rol , y rol principal ,etc.
  function wtfai() {
    var data = {};
    var url = "wtfai";
    postData(url, data)
      .then(resp => {
        if (resp.ok == false) {
          if(location.pathname.includes("/publico") ||  location.pathname.includes("/catalogo") ) return;
          $usuario_db = {};
          //console.log('no log');
          goto('login');
        } else {
          $usuario_db.wtf_descargado = true;
          $usuario_db = resp.usuario;
          if($usuario_db.rol=="administrador"){
            //  db que usa
            $storage = resp.storage
          }
          //console.log('logueado');
        }
      })
      .catch(err => {
        console.log(err);
      });
  }
</script>
