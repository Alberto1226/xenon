import { writable, get } from "svelte/store";
import { logo_rojo_exp, logo_negro_exp } from './stores2'



export const storage = writable("");


export const logo_rojo = logo_rojo_exp;
export const logo_negro = logo_negro_exp;

export var version = writable('0.12.15')
//    Actualizar la ubicaiones de clientes, usado para poder resaltar alguno de entre los demas
export const actualizar_pines_clientes_en_mapa = writable(false);

// Funcin para convertir a fechas huamans
export const convertir_a_fecha_humana = (date) => {
  // Make a respuesta time
  if (!date) return "";
  if (typeof (date) === "string") {
    date = new Date(date);
  }
  var delta = Math.round((+new Date - date) / 1000);

  var minute = 60,
    hour = minute * 60,
    day = hour * 24,
    week = day * 7;

  var respuesta;

  if (delta < 30) {
    respuesta = 'Apenas.';
  } else if (delta < minute) {
    respuesta = 'Hace ' + delta + ' segundos.';
  } else if (delta < 2 * minute) {
    respuesta = 'Hace un minuto.'
  } else if (delta < hour) {
    respuesta = 'Hace ' + Math.floor(delta / minute) + ' minutos.';
  } else if (Math.floor(delta / hour) == 1) {
    respuesta = 'Hace 1  hora.'
  } else if (delta < day) {
    respuesta = Math.floor(delta / hour) + ' horas atrás.';
  } else if (delta < day * 2) {
    respuesta = ' Ayer';
  } else {
    respuesta = date.toLocaleDateString('es-MX');
  }

  return respuesta
}

//  PArte Publica
export var producto_seleccionado = writable(null);
export var mostrando_producto = writable(false);
export var catalogo = writable({
  buscando: "",
  pagina_actual: 1,
  http_ocupado: false,
  total_paginas: 0,
  total_registros: 0,
  coincidencias: 0
});

//  Termina parte publica


export var google_maps_cargado = writable(false);

//    Accion de recargar lista centralizada

export var accion_buscar = writable({
  pedidos: false,
  productos: false,
  clientes: false,
  usuarios: false,
})

export var buscadores = writable({
  pedidos: '',
  productos: '',
  clientes: '',
  usuarios: '',
})

export var paginas_actuales = writable({
  pedidos: 1,
  productos: 1,
  clientes: 1,
  usuarios: 1,
})


//  Editar diferentes registros
export var editar_store = writable({
  usuario: null,
  producto: null,
  cliente: null,
  pedido: null,
  categoria: null
})

//  ocupado_asincrono evita que se generen varias llamadas despuesdde la primera
export var ocupado_asincrono = writable(false);

//   Usuario de DB
export var usuario_db = writable({});

//   Usuario de FIREBASE
export var usuario_firebase = writable({});

//    Lista de pedidos de productos nuevos
export var lista_productos_en_pedido_nuevo = writable([]);


//    Lista de pedidos de productos en pedido siendo editado
export var lista_productos_en_pedido_en_edicion = writable([]);


//   cuando un row es seleccionado para  ver el pedido publico
export var pedido_publico_selecto = writable({ nombre: "ninguno" });
//  El detalle del pedido publico es visible

export var detalle_pedido_publico_es_visible = writable(false);

//   cuando un row es seleccionado para editar 
export var pedido_selecto = writable({ nombre: "ninguno" });

//   cuando un row es seleccionado para editar 
export var producto_selecto = writable({ nombre: "ninguno" });


//   Ventas del producto selecto
export var ventas_producto_selecto = writable({
  id_producto: "",
  desde: new Date(),
  hasta: new Date(),
  lista: [],
  coinciden: 0,
  paginas: 100,
  pagina_actual: 1,
  pendiente: true,
  cargando: false,
  step: 50,
});


//   Ventas del producto selecto
export var ventas_cliente_selecto = writable({
  id_producto: "",
  desde: new Date(),
  hasta: new Date(),
  lista: [],
  coinciden: 0,
  paginas: 100,
  pagina_actual: 1,
  pendiente: true,
  cargando: false,
  step: 50,
});

//   Ventas del producto selecto
export var movimientos_del_producto = writable({
  id_producto: "",
  desde: new Date(),
  hasta: new Date(),
  lista: [],
  coinciden: 0,
  paginas: 100,
  pagina_actual: 1,
  pendiente: true,
  cargando: false,
  step: 50,
  filtros_acciones: {
    inyeccion: true,
    descuento: true,
    sobreescribir: true,
    cambio_apartado_nuevo: true,
    cambio_apartado_cambiar: true,
    cambio_apartado_borrar: true
  }
});

//   cuando un row es seleccionado para editar 
export var cliente_selecto = writable({ nombre: "ninguno" });
//    para mapas despues de tener clietne selecto se descarga la info completa
export var cliente_selecto_completo = writable({ nombre: "ninguno", direcciones_asociadas: [] });
//     para mapas , mostrar emergente con datos del cliente selecto
export var mostrar_emergente_de_cliente_selecto = writable({ mostrar: false, cargando: false });


//   cuando un row es seleccionado para editar 
export var usuario_selecto = writable({ nombre: "ninguno" });

//   usa el componente archivo editar
export var lista_archivos_uploads_editar = writable([])



//lista de pedidos
export const pedidos = writable({
  lista_actualizada: "",
  lista: [],
  actualizar_variable: false,
  total_registros: 0
});

//lista de pedidos publicos de web publica y app
export const pedidos_publicos = writable({
  lista_actualizada: "",
  lista: [],
  actualizar_variable: false,
  total_registros: 0
});

//lista de pedidos cancelados
export const pedidos_cancelados = writable({
  lista_actualizada: "",
  lista: []
});
//lista de pedidos historicos
export const pedidos_historicos = writable({
  lista_actualizada: "",
  lista: []
});
//lista de productos
export const productos = writable({
  lista_actualizada: "",
  lista: [],
  total_registros: 0,
  pagina_actual: 1,
  paginas: 0,
  coincidencias: 0,

});

//lista de promociones
export const promociones = writable({
  lista_actualizada: "",
  lista: [],
  total_registros: 0,
  pagina_actual: 1,
  paginas: 0,
  coincidencias: 0
});
//lista de clientes
export const clientes = writable({
  lista_actualizada: "",
  lista: [],
  total_registros: 0
});
//lista de usuarios
export const usuarios = writable({
  lista_actualizada: "",
  lista: []
});
export const ui = writable({
  ventana_visible: "inicio",
  side_panel_minimizado: false
})
//   para uloader 
export const lista_archivos_uploads = writable([]);

// formato de carbopuntos y precio
export function formato_precio(precio) {
  if (precio == undefined) return "0.00";
  precio = parseFloat(precio);
  if (precio == "" || isNaN(precio)) return "0.00";
  var precio_txt = precio.toLocaleString("en-US", {
    style: "decimal",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
  if (precio == 0) return "0.00";
  return precio_txt;
}

//  App cargando , sustituye la ventana visible para evitar acciones no esperadas por parte del usurio
export var cargando_mensajes_app = writable([]);

/*
$mensajes_app.push({ tipo:"error"  , mensaje:"Bienvenid@ a Carbon Audio 2"});
$mensajes_app = $mensajes_app;
    */
export var mensajes_app = writable([]);





/// Post asyn usado en muchas partes
export async function postData(url = '', data = {}) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/json'
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow', // manual, *follow, error
    referrerPolicy: 'no-referrer', // no-referrer, *client
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  });
  return await response.json(); // parses JSON response into native JavaScript objects
}




export function mensaje_bueno(texto) {
  let tmp_mensajes_app = JSON.parse(JSON.stringify(get(mensajes_app)));
  //console.log(tmp_mensajes_app);
  const mensaje = { tipo: 'exito', mensaje: texto }
  tmp_mensajes_app.push(mensaje);
  mensajes_app.set(tmp_mensajes_app);
}

export function mensaje_error(texto) {
  let tmp_mensajes_app = JSON.parse(JSON.stringify(get(mensajes_app)));
  const mensaje = { tipo: 'error', mensaje: texto }
  tmp_mensajes_app.push(mensaje);
  mensajes_app.set(tmp_mensajes_app);
}

export const options = writable({
  day: "numeric",
  month: "long",

  year: "numeric"
})

export const meses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"

]



