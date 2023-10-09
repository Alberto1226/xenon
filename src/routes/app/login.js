import { Usuario } from './../../models/usuario';
import * as accesos from "./accesos";
const passport = require('passport');
export function post(req, res, next) {

    ////console.log(req.body);
    // //console.log("hhh")
    ////console.log(res)
    // res.setHeader('Content-Type', 'application/json');
    //	res.end(JSON.stringify(article));
    //res.send({message:"yastas"})
    //console.log(user);
    //console.log("************************");
    const user = req.body.usuario;

    passport.authenticate('local.login', function (err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            console.log("El usuario no exite");
            accesos.logActividad('login/fallido-usuario no encontrado', user, JSON.stringify({}), req);
           //console.log(info);
            return res.send({ok:false});
        }
        //console.log(user);
        // se loguea en passport 
        req.logIn(user, function (err, unkn, response) {
            if (err) {

                accesos.logActividad('login/fallido-usuario si exite, password incorrecto', user, JSON.stringify(req.body), req);
                return next(err);
                
            }
            // console.log(response);
           // console.log('aqui');
           accesos.logActividad('login/exitoso', user, JSON.stringify({}), req);
            res.send({ok:true , url:'app/inicio',usuario:user})
            //res.redirect('/app/inicio');
        });
    })(req, res, next);

}

var LocalStrategy = require('passport-local').Strategy;
//var Log_Accion = require('../routes/log_accion');

passport.serializeUser(function (usuario, done) {
    done(null, usuario.id);
});

passport.deserializeUser(function (id, done) {
    Usuario.findById(id, function (err, usuario) {
        done(err, usuario);
    })
});

passport.use('local.login', new LocalStrategy({
    usernameField: 'usuario',
    passwordField: 'password',
    passReqToCallback: true
}, function (req, usuario, password, done) {
    //console.log(password);
    req.checkBody('usuario', 'Usuario Invalido').notEmpty();
    req.checkBody('password', 'Password Invalido').notEmpty();
    var errors = req.validationErrors();
    if (errors) {


        var messages = [];
        errors.forEach(element => {
            messages.push(element.msg);
        });
        return done(null, false, req.flash('error', messages));
    }
    //  all good login

    
    Usuario.findOne({
        'usuario': req.body.usuario
    }, function (err, user) {
        if (err) {
            return done(err);
        }
        if (!user) {
            return done(null, false, {
                message: 'El usuario no existe.'
            });
        }
        if (!user.validPassword(password)) {
            return done(null, false, {
                message: 'Password incorrecto.'
            });
        }
        /*
        if(user.areas_acceso.direccion===false ){
            return done(null, false, {
                message: 'Usted no tiene acceso permitido al área de Direccion.'
            });
        }*/
        if (user.activo === false) {
            return done(null, false, {
                message: 'Usuario desactivado.'
            });
        }
        // Log_Accion.login(req,user, 'Usuario se logueó','Logueo con clave y usuario correctos',false)
        return done(null, user);
    }).catch((err) => {
        console.log(err);

    });
}));