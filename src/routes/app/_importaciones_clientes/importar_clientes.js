
//import {Usuario} from "../../../models/usuario";
var passport = require('passport');
import { municipios } from './municipios'
import { estados } from './estados'
import { paises } from './paises'
import { clientes } from './clientes'
import { agentes } from './agentes'
import { domicilios_fiscales } from './domicilios_fiscales'

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
    let proceso = await guardar_cliente(nuevo_cliente)

     if (proceso.ok) contador.exito++;
     else contador.error++;
    if (i + 1 == total) {
      //console.log(contador);

      return res.send(respuesta_txt);
    }

  }


}

//   OBJETOS 

const direccion_modelo = {
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
  rfc: '',
  razon_social: '',
  viejo_id_direccion:'',
  viejo_id_persona:'',
  tipo:'',
  predeterminada:false,
}

const agente_modelo = {
  nombre: '',
  id: '',
  correo: '',
}

const datos_fiscales = {
  razon_social: '',
  rfc: '',
  nombre: '',
}

const perfil = {
  perfil: "Público en general",
  porcentaje: 0
}

const cliente_modelo = {
  activo: false,
  agente: null,
  alias: '',
  correo: '',
  direcciones_asociadas: [],
  datos_fiscales: null,
  localidad: '',
  nombre: '',
  perfil: null,
  plataforma: "web",
  push_token: "",
  region: "",
  telefono: "",
  uid: "",
  password: "",
  fecha_nacimiento: new Date(),
  fecha_creacion: new Date(),
  fecha_update: new Date(),
  fecha_desactivacion: "",
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
    //let domicilio_fiscal = await convertir_domicilio_fiscal(cliente.id_usuario_sistema);
    //console.log(cliente);
    var nuevo_cliente = JSON.parse(JSON.stringify(cliente_modelo));
    nuevo_cliente.activo = cliente.deleted_at === null;
    nuevo_cliente.agente = procesar_agente(cliente.id_usuario_sistema)
    nuevo_cliente.alias = cliente.alias === null ? '' : cliente.alias;
    nuevo_cliente.correo = cliente.correo === null ? '' : cliente.correo;
    nuevo_cliente.direcciones_asociadas = await procesar_direcciones(cliente.id_usuario);
    let registro_con_rfc = nuevo_cliente.direcciones_asociadas.find(element=>element.rfc!==''&& element.rfc!==null);
    nuevo_cliente.datos_fiscales={
      razon_social:'',
      rfc:registro_con_rfc===undefined?'':registro_con_rfc.rfc,
      nombre:registro_con_rfc===undefined?'':registro_con_rfc.nombre
    }
    let registro_con_localidad = nuevo_cliente.direcciones_asociadas.find(element=>element.localidad!==''&& element.localidad!==null);
    nuevo_cliente.localidad=registro_con_localidad===undefined?'':registro_con_localidad.localidad;
    nuevo_cliente.nombre=cliente.nombre;
    nuevo_cliente.perfil= await convertir_id_perfil(cliente.id_perfil);
    nuevo_cliente.plataforma = cliente.plataforma;
    nuevo_cliente.push_token = cliente.push_token===null?'':cliente.push_token;
    nuevo_cliente.region = cliente.region===null?'':cliente.region;
    nuevo_cliente.telefono = cliente.telefono ===null?'':cliente.telefono;
    nuevo_cliente.uid = cliente.id_usuario;
    nuevo_cliente.password = cliente.password;
    const fecha_nacimiento =corregir_fecha(cliente.fecha_nacimiento);
    nuevo_cliente.fecha_nacimiento =fecha_nacimiento===null?'':fecha_nacimiento;
    nuevo_cliente.fecha_creacion = new Date(cliente.created_at);
    nuevo_cliente.fecha_update = new Date(cliente.updated_at);
    nuevo_cliente.fecha_desactivacion = cliente.deleted_at ===null?'':new Date(cliente.deleted_at);
   // console.log('id_usuario='+cliente.id_usuario);
    

    /*
    {
      activo: cliente.deleted_at === null,
      agente: procesar_agente(cliente.id_usuario_sistema),
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
    }*/
    resolve(nuevo_cliente);
  })
}

function corregir_fecha(fecha_txt) {
  if (fecha_txt === null) return null;
  let fecha = new Date(fecha_txt);

  fecha.setTime(fecha.getTime() + 0 * 60 * 60 * 1000);
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



function procesar_agente(id_usuario_sistema) {
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
//PERSONA
//{  "id_persona":"196","nombre":"Marco Antonio Torres Del Angel","calle":"Rio Salado","noext":"4","noint":"-","colonia":"Paseos de Churubusco",
//  "localidad":"82460","cp":"09030","municipio":"276","id_estado":"9","id_pais":"151","telefono":"015554023566","correo":null},


//DOMICILIO FISCAL
//  {"id_usuario_direccion":"112","id_usuario":"22","id_persona":"151","rfc":"XXXX010101000","entre_calle":"-","y_calle":"-",
//   "instrucciones":"<","tipo":"envio","predeterminada":"0","created_at":"2018-01-03 10:34:22","updated_at":"2018-01-03 10:34:22","deleted_at":null},

//  PROCESAR DIRECICONES DE 1 CLIENTE
async function procesar_direcciones(id_usaurio_sistema) {
return new Promise((resolve,reject)=>{

  const domicilios_fiscales_temp = domicilios_fiscales.filter(element => element.id_usuario === id_usaurio_sistema);
  //console.log(domicilios_fiscales_temp.length);
  
  let lista =[]
  let lista_promesas =[]
  let direccion_temp = JSON.parse(JSON.stringify(direccion_modelo));
  if (domicilios_fiscales_temp.length === 0) return  resolve([direccion_temp]);
  for (let i = 0; i < domicilios_fiscales_temp.length; i++) {
    const element = domicilios_fiscales_temp[i];
    //console.log('id_usaurio_sistema---'+id_usaurio_sistema);
    //console.log('--id_usuario_direccion ---'+element.id_usuario_direccion);
    let direccion_promesa = juntar_persona_y_domicilio(element);
    lista_promesas.push(direccion_promesa);
  }

  Promise.all(lista_promesas)
  .then((valores)=>{

   // console.log('Terminando de juntar direccioens');
    return resolve (valores);
    
  })
})



}

function juntar_persona_y_domicilio(domicilio) {
  return new Promise((resolve, reject) => {
   
      const id_persona = domicilio === undefined ? null : domicilio.id_persona;
      const persona = personas.find(element => element.id_persona === id_persona);
      let direccion_temp = JSON.parse(JSON.stringify(direccion_modelo));
      if (persona === null || persona === undefined) {
        //console.log('ERRORR no se encontro ' + domicilio.id_usuario)
      };
      direccion_temp.viejo_id_direccion = domicilio.id_usuario_direccion;
      direccion_temp.viejo_id_persona = domicilio.id_persona;
      direccion_temp.calle = persona.calle ===null?'':persona.calle;
      direccion_temp.colonia = persona.colonia ===null?'':persona.colonia;
      direccion_temp.cp = persona.cp ===null?'':persona.cp;
      direccion_temp.entre_calle = domicilio.entre_calle ===null?'':domicilio.entre_calle;
      const estado = convertir_id_estado(persona.id_estado);
      direccion_temp.estado = estado===""?'*noestado*':estado;
      direccion_temp.localidad =persona.localidad ===null?'':persona.localidad;
      let municipio  = convertir_id_municipio(persona.municipio);
      municipio = municipio ===""?persona.municipio:municipio;
      municipio = municipio ===null?'':municipio;
      direccion_temp.municipio = municipio;
      direccion_temp.nombre = persona.nombre===null?'':persona.nombre;
      direccion_temp.notas = domicilio.instrucciones ===null?'':domicilio.instrucciones;
      direccion_temp.numero_exterior = persona.noext===null?'':persona.noext;
      direccion_temp.numero_interior = persona.noint===null?'':persona.noint;
      direccion_temp.pais = convertir_id_pais(persona.id_pais);
      direccion_temp.y_calle = domicilio.y_calle===null?'':domicilio.y_calle;
      direccion_temp.rfc = domicilio.rfc===null?'':domicilio.rfc;
      direccion_temp.tipo = domicilio.tipo;
      direccion_temp.telefono = persona.telefono===null?'':persona.telefono;;
      direccion_temp.predeterminada = domicilio.predeterminada==="1"?true:false;
      return resolve(direccion_temp)
   

  })
}



function convertir_direccion(id_usuario_sistema) {
  return new Promise(async (resolve, reject) => {

    let domicilio_fiscal = domicilios_fiscales.find(element => element.id_usuario === id_usuario_sistema);
    let id_persona = domicilio_fiscal === undefined ? null : domicilio_fiscal.id_persona;
    let persona = personas.find(element => element.id_persona === id_persona);
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
    let persona = personas.find(element => element.id_persona === id_persona);
    let temp;
    if (domicilio_fiscal === null || domicilio_fiscal === undefined || domicilio_fiscal === '') {
      temp = {
        nombre: '',
        direccion: null,
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
    let persona = personas.find(element => element.id_persona === id_persona);
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
  let municipio = municipios.find(element => element.id == id_municipio);
  let temp;
  if (municipio === null || municipio === undefined || municipio === '') {
    temp = ''
    return temp
  }
  temp = municipio.nombre


  return temp
}
