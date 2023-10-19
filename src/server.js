import sirv from 'sirv';
import express from 'express';
import compression from 'compression';
import * as sapper from '@sapper/server';
import { llaves, devolver_nombre_db } from "./config/llaves";
import { inicializacion_completa } from "./servicio_nuevo"
const fs = require('fs')
var passConf = require("passport");
var path = require('path');
var helmet = require('helmet');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var session = require('express-session');
var passport = require('passport');
var validator = require('express-validator');
var version = '0.12.02';
var FgBlack = "\x1b[30m";
var FgRed = "\x1b[31m";
var FgGreen = "\x1b[32m";
var FgYellow = "\x1b[33m";
var FgBlue = "\x1b[34m";
var BgGreen = "\x1b[42m";
var FgWhite = "\x1b[37m";
var Reset = "\x1b[0m";
console.log();
console.log(FgBlue + '#---------------------------------------------------------------------------------------------------------------------------------#');
console.log('\x1b[36m%s\x1b[0m', '-Iniciando servidor');


//	Logs de actividades, por medio de agregar al fondo del archivo , sin leerlo.
const pathLogs = '../log-especifico.txt';
fs.closeSync(fs.openSync(pathLogs, 'a'))




const { PORT, NODE_ENV, DB, INICIAR_DESDE_CERO } = process.env;
const dev = NODE_ENV === 'development';
if (!process.env.DB) {
	console.log(FgRed + "Ojo, No tiene DB" + Reset);
	process.env.DB = "xenon-y-mas-app"
	console.log("Ahora su db sera " + FgBlue + process.env.DB + Reset);
}
console.log("DB usada =" + FgBlue + devolver_nombre_db() + " , osea :" + process.env.DB + Reset);
console.log(FgBlue + '#---------------------------------------------------------------------------------------------------------------------------------#' + Reset);
//if(!dev) process.env.PORT = 3004;

//process.env.INICIAR_DESDE_CERO ="doit";
//po rseguridad le pondre este if primero
if (process.env.DB != "xenon-y-mas-app") {
	console.log(process.env.INICIAR_DESDE_CERO);
	console.log(process.env.DB);
	if (process.env.INICIAR_DESDE_CERO && process.env.INICIAR_DESDE_CERO == "doit") {
		console.log(BgGreen + '#---------------------------------------------------------------------------------------------------------------------------------#' + Reset);
		console.log("Reiniciando DB");
		inicializacion_completa();
		console.log(BgGreen + '#---------------------------------------------------------------------------------------------------------------------------------#' + Reset);
	}
}

mongoose.connect(`mongodb+srv://root:11111@xenon.02uz8yx.mongodb.net/xenon-y-mas-app`, {
	useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false
})
	.then(() => {
		console.log(FgGreen + "  Mongoose, acceso a DB: " + FgBlue + 'Ok' + FgGreen);
		console.log('  ' + "Modo: " + FgBlue + process.env.NODE_ENV + FgGreen);
		console.log('  Express en: ' + FgBlue + process.env.PORT + '\n' + FgWhite + Reset);
	})
	.catch((err) => {
		console.log(err);
	})




const app = express();
//  logs en el servidor sobre lo que pasa con posts y gets
app.use(logger('dev'));
//  limitar lo que se va a procesar en servidor 
app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ limit: "5mb", extended: true, parameterLimit: 50000 }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(validator());
app.use(cookieParser());
app.use(function (req, res, next) {
	res.locals.login = req.isAuthenticated();
	next();
});
/*app.use(helmet.contentSecurityPolicy({
	directives: {
	  defaultSrc: ["'self'"],
	  styleSrc: ["'self'"]
	}
  })); */

//app.use(express.static(path.join(__dirname, 'static')));

app.use(helmet());
app.disable('x-powered-by')


//app.use(session({ secret: 's1##2$$5bssDx;pld-9&*5767..0', resave: false, saveUninitialized: false }));
app.use(session({ secret: 's1##2$$5sdsdsdbssDx;f42978pld-9&*576fd*5850', cookie: { maxAge: 24 * 60 * 60 * 1000 }, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(
	compression({ threshold: 0 }),
	sirv('static', { dev }),
	sapper.middleware()
)
	.listen(PORT, err => {
		console.log("-Sapper con Express http server corriendo en puerto :" + FgBlue + PORT);
		console.log(FgGreen);
		console.log("Xenon App (PWA administrativos)" + FgWhite + " v." + version);
		console.log(FgGreen);
		if (err) console.log('error', err);
	});

