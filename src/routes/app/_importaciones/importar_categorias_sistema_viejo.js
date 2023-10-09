import { Categoria } from "../../../models/categoria";

var _ = require('underscore');

export async function get(req, res, next) {
    Categoria.deleteMany({})
    .then(async()=>{
        for (let i = 0; i < categorias_importado.length; i++) {
            const element = categorias_importado[i];
            await guardar(element);
            if(i+1===categorias_importado.length){
                res.send('hecho')
            }
        }
    })
   
}



const guardar = async (element) =>{
    return new Promise((resolve,reject)=>{
        let nueva = new Categoria({element})
        nueva.id_categoria = element.id_categoria;
        nueva.id_cat_padre = element.id_cat_padre?element.id_cat_padre:'null';
        nueva.descripcion = element.descripcion;
        nueva.imagen = element.imagen;
        nueva.borrado = new Date(element.deleted_at);
        nueva.actualizado = element.updated_at==='0000-00-00 00:00:00'?null:element.updated_at;
        nueva.creado = new Date(element.created_at);

        nueva.save()
        .then(()=>{
            resolve()
        })
        .catch((err)=>{
            console.log(err)
            reject()
        })
    })
}




const categorias_importado = [
    { "id_categoria": "1", "id_usuario_sistema": null, "id_cat_padre": null, "izq": "1", "der": "14", "descripcion": "Audio", "orden": "0", "imagen": "1.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "2", "id_usuario_sistema": null, "id_cat_padre": "1", "izq": "12", "der": "13", "descripcion": "Accesorios", "orden": "1", "imagen": "2.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "3", "id_usuario_sistema": null, "id_cat_padre": "1", "izq": "6", "der": "7", "descripcion": "Amplificadores y modulares", "orden": "1", "imagen": "3.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "4", "id_usuario_sistema": null, "id_cat_padre": "1", "izq": "4", "der": "5", "descripcion": "Autoestereos y multimedia", "orden": "1", "imagen": "4.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "5", "id_usuario_sistema": null, "id_cat_padre": "1", "izq": "2", "der": "3", "descripcion": "Kit de cables y rollos", "orden": "1", "imagen": "5.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "6", "id_usuario_sistema": null, "id_cat_padre": "1", "izq": "8", "der": "9", "descripcion": "Material acústico y aislante", "orden": "1", "imagen": "6.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "7", "id_usuario_sistema": null, "id_cat_padre": "1", "izq": "10", "der": "11", "descripcion": "Tweeter, altavoces y sub woofer", "orden": "1", "imagen": "7.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "8", "id_usuario_sistema": null, "id_cat_padre": null, "izq": "15", "der": "38", "descripcion": "Iluminacion LED", "orden": "0", "imagen": "8.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "9", "id_usuario_sistema": null, "id_cat_padre": "8", "izq": "18", "der": "19", "descripcion": "Accesorios de led", "orden": "1", "imagen": "9.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "10", "id_usuario_sistema": null, "id_cat_padre": "8", "izq": "16", "der": "17", "descripcion": "Barras de led", "orden": "1", "imagen": "10.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "11", "id_usuario_sistema": null, "id_cat_padre": "8", "izq": "28", "der": "37", "descripcion": "Led Headlight", "orden": "1", "imagen": "11.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "12", "id_usuario_sistema": null, "id_cat_padre": "8", "izq": "20", "der": "21", "descripcion": "Mini led", "orden": "1", "imagen": "12.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "13", "id_usuario_sistema": null, "id_cat_padre": "8", "izq": "22", "der": "23", "descripcion": "Mini led Osram", "orden": "1", "imagen": "13.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "14", "id_usuario_sistema": null, "id_cat_padre": "8", "izq": "24", "der": "25", "descripcion": "Tira de led", "orden": "1", "imagen": "14.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "15", "id_usuario_sistema": null, "id_cat_padre": "8", "izq": "26", "der": "27", "descripcion": "Unidades de led", "orden": "1", "imagen": "15.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "16", "id_usuario_sistema": null, "id_cat_padre": null, "izq": "39", "der": "44", "descripcion": "Iluminacion Xenon", "orden": "0", "imagen": "16.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "17", "id_usuario_sistema": null, "id_cat_padre": "16", "izq": "40", "der": "41", "descripcion": "Kit 55 W", "orden": "1", "imagen": "17.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "18", "id_usuario_sistema": null, "id_cat_padre": "16", "izq": "42", "der": "43", "descripcion": "Medidas especiales", "orden": "1", "imagen": "18.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "19", "id_usuario_sistema": null, "id_cat_padre": null, "izq": "45", "der": "58", "descripcion": "Seguridad", "orden": "0", "imagen": "19.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "20", "id_usuario_sistema": null, "id_cat_padre": "19", "izq": "46", "der": "47", "descripcion": "Accesorios de seguridad", "orden": "1", "imagen": "20.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "21", "id_usuario_sistema": null, "id_cat_padre": "19", "izq": "48", "der": "49", "descripcion": "Alarmas", "orden": "1", "imagen": "21.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "22", "id_usuario_sistema": null, "id_cat_padre": "19", "izq": "50", "der": "51", "descripcion": "Camara de Reversa", "orden": "1", "imagen": "22.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "23", "id_usuario_sistema": null, "id_cat_padre": "19", "izq": "52", "der": "53", "descripcion": "GPS", "orden": "1", "imagen": "23.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "24", "id_usuario_sistema": null, "id_cat_padre": "19", "izq": "54", "der": "55", "descripcion": "Sensores de reversa", "orden": "1", "imagen": "24.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "25", "id_usuario_sistema": null, "id_cat_padre": "19", "izq": "56", "der": "57", "descripcion": "TPMS", "orden": "1", "imagen": "25.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "26", "id_usuario_sistema": null, "id_cat_padre": "11", "izq": "29", "der": "30", "descripcion": "Carbon Led", "orden": "2", "imagen": "26.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "27", "id_usuario_sistema": null, "id_cat_padre": "11", "izq": "31", "der": "32", "descripcion": "Sixty", "orden": "2", "imagen": "27.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "28", "id_usuario_sistema": null, "id_cat_padre": "11", "izq": "33", "der": "34", "descripcion": "Vision Dual", "orden": "2", "imagen": "28.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "29", "id_usuario_sistema": null, "id_cat_padre": "11", "izq": "35", "der": "36", "descripcion": "Vision", "orden": "2", "imagen": "29.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null }
]
