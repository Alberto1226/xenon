
//import {Usuario} from "../../../models/usuario";
var passport = require('passport');
import { municipios } from './municipios'
import { estados } from './estados'
import { paises } from './paises'
import { clientes } from './clientes'
import { agentes } from './agentes'
import { domicilios_fiscales } from './domicilios_fiscales'
import { direcciones } from './direcciones'
import { perfiles } from './perfiles'
import { personas } from './personas'
import { Cliente } from '../../../models/cliente';
export async function get(req, res, next) {

  let clientes_tmp = JSON.parse(JSON.stringify(clientes));
  let respuesta_txt = ''
  let arreglo = [];
  let contador = {
    exito: 0, error: 0
  }
  let total = clientes_tmp.length;
  //let total = 3
  for (let i = 0; i < total; i++) {
    const cliente = clientes_tmp[i];

    let nuevo_cliente = await constructor(cliente);
    //console.log(nuevo_cliente);

    arreglo.push(nuevo_cliente)
    respuesta_txt += '<div>' + i + ')' + JSON.stringify(nuevo_cliente) + '</div><br>';
    //let proceso = await guardar_cliente(nuevo_cliente)

    if (proceso.ok) contador.exito++;
    else contador.error++;
    if (i + 1 == total) {
      // console.log(contador);

      return res.send(respuesta_txt);
    }

  }


}


function guardar_cliente(cliente_nuevo) {
  return new Promise((resolve, reject) => {
    let cliente_nuevo_tmp = new Cliente(cliente_nuevo);
    cliente_nuevo_tmp.save()
      .then(() => {
        resolve({ ok: true });
        return
      })
      .catch((err) => {
        console.log(err);
        reject({ ok: false });
        return;
      })
  })
}

async function constructor(cliente) {
  return new Promise(async (resolve) => {
    let domicilio_fiscal = await convertir_domicilio_fiscal(cliente.id_usuario_sistema);
    //console.log(cliente);
    var nuevo_cliente = {
      activo: cliente.deleted_at === null,
      agente: convertir_agente(cliente.id_usuario_sistema),
      alias: cliente.alias === null ? '' : cliente.alias,
      correo: cliente.correo,
      direccion_envio: await convertir_direccion(cliente.id_usuario_sistema),
      domicilio_fiscal: domicilio_fiscal,
      fecha_nacimiento: corregir_fecha(cliente.fecha_nacimiento),
      nombre: cliente.nombre,
      perfil: convertir_id_perfil(cliente.id_perfil),
      plataforma: cliente.plataforma,
      push_token: cliente.push_token,
      region: cliente.region,
      telefono: cliente.telefono,
      uid: cliente.id_usuario,
      password: cliente.password,
    }
    resolve(nuevo_cliente);
  })
}

function corregir_fecha(fecha_txt) {
  if (fecha_txt === null) return null;
  let fecha = new Date(fecha_txt);

  fecha.setTime(fecha.getTime() + 8 * 60 * 60 * 1000);
  return fecha;
}
const perfiles_lista = [
  { id_perfil: "1", perfil: "Elite", porcentaje: 55 },
  { id_perfil: "2", perfil: "Distribuidor", porcentaje: 50 },
  { id_perfil: "3", perfil: "Mayoreo", porcentaje: 45 },
  { id_perfil: "4", perfil: "Menudeo", porcentaje: 40 },
  { id_perfil: "5", perfil: "Elite", porcentaje: 10 },
  { id_perfil: "6", perfil: "Público en general", porcentaje: 0 }
];


function convertir_unidad(id) {
  switch (id) {
    case "1":
      return "Pieza";
      break;
    case "2":
      return "Caja";
      break;
    case "3":
      return "Par";
      break;
    case "4":
      return "Paquetería";
      break;
    case "5":
      return "Millar";
      break;

    default:
      return "Pieza";
      break;
  }
}

function convertir_marca(numero) {
  switch (numero) {
    case "1":
      return "Puma Security";
      break;
    case "2":
      return "Star Watt";
      break;
    case "3":
      return "Carbon Xenon";
      break;
    case "6":
      return "Carbon Audio";
      break;
    case "7":
      return "Sixty";
      break;
    case "8":
      return "Carbon Led";
      break;

    case "14":
      return "Kompak";
      break;
    case "15":
      return "Vision2";
      break;
    case "16":
      return "Osram";
      break;
    case "17":
      return "Denka";
      break;
    case "18":
      return "Sixty C6";
      break;

    default:
      return "Carbon Audio";
      break;
  }
}


function convertir_medida(id_medida) {
  let medida = medidas.find(element => element.id_medida === id_medida);
  let temp;
  if (medida === null || medida === undefined) {
    temp = {
      medidas: {
        medida: '',
        categoria: '',
        bajas: '',
        wattaje: '',
      }
    }
    return temp
  }
  temp = {
    medidas: {
      medida: medida.medida,
      categoria: medida.categoria,
      bajas: medida.bajas,
      wattaje: medida.wattaje,
    }
  }
  return temp
}


function convertir_id_perfil(id_perfil) {
  let perfil = perfiles.find(element => element.id_perfil === id_perfil);
  let temp;
  if (perfil === null || perfil === undefined || perfil === '') {
    temp = {
      perfil: 'Público general',
      porcentaje: 0
    }
    return temp
  }
  temp = {
    perfil: perfil.perfil,
    porcentaje: perfil.porcentaje
  }


  return temp
}



function convertir_agente(id_usuario_sistema) {
  let agente = agentes.find(element => element.id_usuario_sistema === id_usuario_sistema);
  let temp;
  if (agente === null || agente === undefined || agente === '') {
    temp = {
      nombre: '',
      id: '',
      correo: '',
    }
    return temp
  }
  temp = {
    nombre: agente.nombre,
    id: agente._id,
    correo: agente.correo,
  }


  return temp
}


function convertir_direccion(id_usuario_sistema) {
  return new Promise(async (resolve, reject) => {

    let domicilio_fiscal = domicilios_fiscales.find(element => element.id_usuario === id_usuario_sistema);
    let id_persona = domicilio_fiscal === undefined ? null : domicilio_fiscal.id_persona;
    let direccion = direcciones.find(element => element.id_persona === id_persona);
    let temp;
    if (direccion === null || direccion === undefined || direccion === '') {
      temp = {
        calle: '',
        colonia: '',
        cp: '',
        entre_calle: '',
        estado: '',
        localidad: '',
        municipio: '',
        nombre: '',
        notas: '',
        numero_exterior: '',
        numero_interior: '',
        pais: '',
        y_calle: '',
      }
      return resolve(temp)
    }
    temp = {
      calle: direccion.calle,
      colonia: direccion.colonia,
      cp: direccion.cp,
      entre_calle: domicilio_fiscal.entre_calle,
      estado: await convertir_id_estado(direccion.id_estado),
      localidad: direccion.localidad,
      municipio: await convertir_id_municipio(direccion.municipio),
      nombre: direccion.nombre,
      notas: '-importado-',
      numero_exterior: direccion.noext,
      numero_interior: direccion.noint,
      pais: await convertir_id_pais(direccion.id_pais),
      y_calle: domicilio_fiscal.entre_calle,
    }


    return resolve(temp)
  })
}



async function procesar_datos_fiscales(id_usuario_sistema) {
  return new Promise(async (resolve, reject) => {
    let domicilio_fiscal = domicilios_fiscales.find(element => element.id_usuario === id_usuario_sistema);
    let id_persona = domicilio_fiscal === undefined ? null : domicilio_fiscal.id_persona;
    let direccion = direcciones.find(element => element.id_persona === id_persona);
    let temp;
    if (domicilio_fiscal === null || domicilio_fiscal === undefined || domicilio_fiscal === '') {
      temp = {
        nombre: '',
        direccion: await procesar_direccion_fiscal(id_usuario_sistema),
        razon_social: '',
        rfc: '',
      }
      resolve(temp)
      return temp
    }
    temp = {
      nombre: '',
      direccion: await procesar_direccion_fiscal(id_usuario_sistema),
      razon_social: '',
      rfc: '',
    }

    return resolve(temp);
  })
}


async function convertir_domicilio_fiscal(id_usuario_sistema) {
  return new Promise(async (resolve, reject) => {
    let domicilio_fiscal = domicilios_fiscales.find(element => element.id_usuario === id_usuario_sistema);
    let id_persona = domicilio_fiscal === undefined ? null : domicilio_fiscal.id_persona;
    let direccion = direcciones.find(element => element.id_persona === id_persona);
    let temp;
    if (domicilio_fiscal === null || domicilio_fiscal === undefined || domicilio_fiscal === '') {
      temp = {
        calle: '',
        colonia: '',
        cp: '',
        estado: '',
        localidad: '',
        municipio: '',
        numero_exterior: '',
        numero_interior: '',
        nombre: '',
        notas: '',
        numero_exterior: '',
        pais: '',
        razon_social: '',
        rfc: '',
      }
      resolve(temp)
      return temp
    }
    temp = {
      calle: direccion.calle,
      colonia: direccion.colonia,
      cp: direccion.cp,
      estado: await convertir_id_estado(direccion.id_estado),
      localidad: direccion.localidad,
      municipio: await convertir_id_municipio(direccion.municipio),
      numero_exterior: direccion.noext,
      numero_interior: direccion.noint,
      nombre: direccion.nombre,
      notas: '-importado-',
      pais: await convertir_id_pais(direccion.id_pais),
      razon_social: direccion.nombre,
      rfc: domicilio_fiscal.rfc,
    }

    return resolve(temp);
  })
}


function convertir_id_pais(id_pais) {
  let pais = paises.find(element => element.id_pais === id_pais);
  let temp;
  if (pais === null || pais === undefined || pais === '') {
    temp = ''
    return temp
  }
  temp = pais.descripcion


  return temp
}




function convertir_id_estado(id_estado) {
  let estado = estados.find(element => element.id === id_estado);
  let temp;
  if (estado === null || estado === undefined || estado === '') {
    temp = ''
    return temp
  }
  temp = estado.nombre


  return temp
}



function convertir_id_municipio(id_municipio) {
  let municipio = municipios.find(element => element.id === id_municipio);
  let temp;
  if (municipio === null || municipio === undefined || municipio === '') {
    temp = ''
    return temp
  }
  temp = municipio.nombre


  return temp
}
