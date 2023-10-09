
import fs from 'fs';
import { isString } from 'underscore';
var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');


var schema = new Schema({
    activo: { type: Boolean, default: true },
    fecha: { type: Date, default: new Date() },
    usuario: {
        nombre: { type: String, default: 'anonimo' },
        id: { type: String, default: '' },
    },
    accion: { type: String, default: '' },
    body: { type: String, default: '' },
    client: {
        ip: { type: String, default: '' },
        browser: { type: String, default: '' }
    },
    previousValue: { type: String, default: '' },

    error: { type: Boolean, default: false },
});


schema.statics.registrarLog = async function (ruta, usuario, body, req,error) {
    return new Promise(async (resolve, reject) => {
        try {
            var id ="666-666-1";
            if(!error) id = await logActividad(ruta, usuario, body, req);
            else  id = await logActividad(ruta, usuario, body, req,null,error);
            console.log("----++++++++++++++++++++++")
            console.log(id)
            resolve(id);
        } catch (err) {
            console.log(err);
            reject(err);
        }
    })
};


export var Log = mongoose.model('Log', schema);




export async function logActividad(ruta, usuario, body, req, previousValue = 'ninguno',error = false) {
    return new Promise((resolve, reject) => {

        // 'a' flag stands for 'append'
        var body_stringyfied = isString(body) ? body : JSON.stringify(body);
        try {
            var lognuevo = new Log({
                activo: true,
                fecha: new Date(),
                usuario: {
                    nombre: usuario.usuario,
                    id: usuario._id,
                },
                accion: ruta,
                body: body_stringyfied,
                client: {
                    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                    browser: req.header('user-agent')
                },
                previousValue: previousValue,
                error

            });

            var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            // const log = fs.createWriteStream('../log-especifico.txt', { flags: 'a' });
            const fecha = Date().toLocaleString('es-MX');
            // on new log entry ->
            /* log.write(`\n ${fecha} - usuario:${usuario.usuario} 
                            \n - ruta:${ruta} 
                            \n- body:${body_stringyfied} 
                            \n ip :${ip}
                            \n browser:${req.header('user-agent')}
                                \n` );
    
            // you can skip closing the stream if you want it to be opened while
            // a program runs, then file handle will be closed
            log.end();  */
            lognuevo.save().then((resultadoSave) => {
                //console.log('Registro en DB de accion')
                //console.log(resultadoSave);
                //console.log(resultadoSave._id);
                return resolve(resultadoSave._id);
            })

        } catch (error) {
            console.log('*****ERROR A1')
            console.log(console.error());
            reject(error);
            throw error;
        }
    })


}