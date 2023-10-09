
import {Log_error} from '../../../../../models/log_error';

export async function registrar_error(error , ruta) {
    const nuevo_log = new Log_error({error, ruta});

    return nuevo_log.save()
    .then((resultado)=>{
        return {ok:true}
    })
    .catch((err)=>{
        throw err;
    })
}
