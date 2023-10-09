
import fs from 'fs';
import { isString } from 'underscore';

var nodemailer = require("nodemailer");
var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

var schema = new Schema({
    activo: { type: Boolean, default: true },
    fecha_creacion: { type: Date, default: new Date() },
    fecha_entregado: { type: Date, default: new Date() },
    email_destino: {
        email: { type: String, default: 'raffert86@gmail.com' }
    },
    nombre: { type: String, default: '' },
    email_origen: {
        nombre: { type: String, default: "Soporte Xenon" },
        host: { type: String, default: "mail.xenonymas.com.mx" },
        port: { type: Number, default: 465 },
        secure: { type: Boolean, default: true },
        auth: {
            user: { type: String, default: "noreply@xenonymas.com.mx" },
            pass: { type: String, default: "^LM12B0UulO2^LM12B0UulO2" },
        }
    },
    contenido: {
        text: { type: String, default: "" },
        html: { type: String, default: "" },
        subject: { type: String, default: "" },
    },
    enviado: { type: Boolean, default: false }
});


schema.statics.mandarMail = async function (subject, bodyhtml, email_to) {

    const mailOptions = {
        from: "Xenon y mas <noreply@xenonymas.com.mx>",
        to: email_to,
        subject: "Reporte de error ",
        html: bodyhtml,
    };

    var smtpConfig = {
        host: "mail.xenonymas.com.mx",
        port: 465,
        secure: true, // use SSL
        auth: {
            user: "noreply@xenonymas.com.mx",
            pass: "^LM12B0UulO2^LM12B0UulO2"
        }
    };

    var mailTransport = nodemailer.createTransport(smtpConfig);

    return mailTransport
        .sendMail(mailOptions)
        .then(() => {
            //console.log("Nuevo email enviado a :", carrito.cliente.correo);
            return { ok: true, mensaje: 'Email enviado' };
            
        })
        .catch((error) => {
            console.error(error);
            return { ok: false, mensaje: 'Email no pudo ser enviado enviado' }
            
        });
}


//          Funciones estaticas


schema.statics.mandarEmailASoporte = async function (subject, body_html, email_from_email, email_from_password) {

    try {
        await mandarEmailFn(subject, body_html, email_from_email, email_from_password);
        return { ok: true, mensaje: 'enviado' };
    } catch (err) {
        console.log(err);
        return err;
    }
};




async function mandarEmailFn(subject, body_html, email_from_email, email_from_password) {
    //  configurar el registro del email en mongo
    var pass = "^LM12B0UulO2^LM12B0UulO2";
    var emailNuevo = {
        activo: true,
        fecha: new Date(),
        email_destino: 'raffert86@gmail.com',
        email_origen: {
            host: "mail.xenonymas.com.mx",
            port: 465,
            secure: true,
            auth: {
                user: email_from_email != "" ? email_from_email : "noreply@xenonymas.com.mx",
                pass: email_from_password != "" ? email_from_password : pass,
            }
        },
        body: body_html ? body_html : 'contenido',
        intentos: 1,
        enviado: false
    }

    //  configurar nodemailer con lo previamente configurado

    var smtpConfig = {
        host: "mail.xenonymas.com.mx",
        port: 465,
        secure: true, // use SSL
        auth: {
            user: "noreply@xenonymas.com.mx",
            pass: "^LM12B0UulO2^LM12B0UulO2"
        }
    };

    var mailTransport = nodemailer.createTransport(smtpConfig);
    const mailOptions = {
        from: "Xenon y mas <noreply@xenonymas.com.mx>",
        to: emailNuevo.email_destino,
        subject: subject,
        html: body_html,

    };

    return mailTransport
        .sendMail(mailOptions)
        .then(() => {
            //console.log("Nuevo email enviado a :", carrito.cliente.correo);

            return { ok: true, mensaje: 'Email enviado' };
        })
        .catch((error) => {
            console.error(error);

            return { ok: false, mensaje: 'Email no pudo ser enviado enviado' };
        });
}


export var Email = mongoose.model('Email', schema);