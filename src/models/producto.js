
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');


var schema = new Schema({
    activo: { type: Boolean, default: true },
    aplicar_descuento_distribuidor: { type: Boolean, default: true },
    caracteristicas_tecnicas: [],
    carritos: [],
    categoria_tags: [],// para facilitar encontrar todas las categorias padres de un producto
    //      {descripcion:"",id_cat_padre:"",id_categoria:""}
    category: {
        nombre: { type: String, default: '' },
        imagen: { type: String, default: '' }
    },
    subcategoria: {
        nombre: { type: String, default: '' },
        imagen: { type: String, default: '' }
    },
    //categoria_img: { type: String, default: '' },
    codigo: { type: String, default: "" },
    codigo_clave: { type: String, default: "" },
    codigo_de_barras: { type: String, default: "" },
    descripcion: { type: String, default: "" },
    existencia: {
        actual: { type: Number, default: 0 },
        minimo: { type: Number, default: 0 },
        maximo: { type: Number, default: 0 },
        folios: []
    },
    promo: {
        tiene_promo: { type: Boolean, default: false },
        precio: { type: Number, default: 0 },//    precio del prodcuto con promocion
        tipo_condicion: { type: Number, default: 0 },//    1: Sin condicion, 2: minimo de el mismo producto, 3: Minimo de combo
        id_promocion: { type: String, default: "" },//    id de la promocion, nunca se debe de borrar las promos solo virtualmente
    },
    galeria_imagenes: [],
    marca: { type: String, default: 0 },
    medidas: {
        medida: { type: String, default: '' },
        categoria: { type: String, default: '' },
        bajas: { type: String, default: '' },
        wattaje: { type: String, default: '' },
    },
    nombre: { type: String, default: 0 },
    para_venta_publico: { type: Boolean, default: true },
    precio: { type: Number, default: 0 },
    recomendar_como_paqueteria: { type: Boolean, default: false },
    unidad: { type: String, default: '' },
    uid_previo: { type: String, default: '' },
});








schema.methods.total_reservado = function () {
    try {
        const total_reservado = this.carritos.reduce((a, b) => +a + parseInt(b.cantidad), 0);
        return total_reservado;
    } catch (err) {
        console.log(err);
        throw new Error("No se pudo calcular el total de productos reservados")
    }
};



schema.methods.total_disponible = function () {
    try {
        return this.existencia.actual - this.total_reservado();
    } catch (err) {
        console.log(err);
        throw new Error("No se pudo calcular el total disponible")
    }
};



schema.methods.se_le_pueden_descontar = function (cantidad) {
    try {
        return this.total_disponible() - cantidad >= 0;
    } catch (err) {
        console.log(err);
        throw new Error("No se pudo calcular si alcanza para el pedido")
    }
};



/* Recibe una lista de folios, devuelve la misma lista con una estructura distinta  */
/* Recibe    listya_de__folios=[String]      */
/*  Resoponde con */
/* { 
    detalle :[{folio:<String>,existe:<Boolean>} ],
    si_cuenta_con_todos:<Boolean>
    }

*/
schema.methods.reporte_folios = function (lista_de_folios) {
    try {
        var contador_existentes = 0;
        let detalle = lista_de_folios.map((elem) => {
            const existe = this.existencia.folios.includes(elem);
            if (existe == true) contador_existentes++
            return {
                folio: elem,
                existe
            }
        })
        return {
            detalle,
            si_cuenta_con_todos: contador_existentes == lista_de_folios.length
        }
    } catch (err) {
        console.log(err);
        throw new Error("No se pudo calcular si alcanza para el pedido")
    }
};


export var Producto = mongoose.model('Producto', schema);