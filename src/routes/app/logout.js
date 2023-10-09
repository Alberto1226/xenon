
//import {Usuario} from "../../../models/usuario";
var passport = require('passport');
import * as accesos from "./accesos"
export function post(req,res,next){
    let user = req.user?req.user:"sin user por alguna razon"
    req.logOut();
    accesos.logActividad('logout/exitoso', user, "{}", req);
    res.send({ok:true});
}


