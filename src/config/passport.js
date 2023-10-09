var passport = require('passport');
var Usuario = require('../models/usuario');
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
    //console.log(req.body);
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
        if(user.activo===false ){
            return done(null, false, {
                message: 'Usuario desactivado.'
            });
        }
       // Log_Accion.login(req,user, 'Usuario se logueó','Logueo con clave y usuario correctos',false)
        return done(null, user);
    }).catch((err)=>{
        console.log(err);
        
    });
}));