
//import {Usuario} from "../../../models/usuario";
var passport = require('passport');

import { Cliente } from '../../../models/cliente';
export  function get(req, res, next) {
 Cliente.deleteMany({})
  .then((respuesta)=>{
    res.send(respuesta)
  })
  .catch((err)=>{
    res.send(err);
  })
}
