import fs from 'fs';
import * as accesos from './../accesos';
import { result } from 'underscore';


export async function get(req, res, next) {

    if(accesos.tiene_permisos_administrativos(req) === false){
        return res.send( "0lPUyBFTVBSRVNBUklBTEVTIFNDCgpDb25jZXB0b3N8ODQxMTE1MDZ8MXxBQ1R8UGFnb3wwLjB8MC4wCgpQYWdvcwpQYWdvczEwfDIwMjAtMDctMTNUMTE6MTA6MDB8MDJ8TVhOfE1YTnwxMDAwfDAxNDk2MjJ8QkJWQSBCQU5DT01FUiBTLkEufDAwNDQyMzUyNTE2fDAxNzk2MzY4NTY2CkRvY3Rvc3JlbGFjaW9uYWRvcwpEb2N0b3JlbGFjaW9uYWRvfDE5YzJjZmU1MC01NWYxLTQ4MDQtOTVlNy0yNzdkMWM2MjE3MDR8MTIzNDU2Nzg5MUFBfE1YTnxQUER8MXw3NjAuOTd8MTAuOTd8NzUwLjAwCkRvY3RvcmVsYWNpb25hZG98MjljMmNmZTUwLTU1ZjEtNDgwNC05NWU3LTI3N2QxYzYyMTcwNHwxMjM0NTY3ODkxQUF8TVhOfFBQRHwxfDc1MC4wMHw3MDB8NTAuMDAKClBhZ29zClBhZ29zMTB8MjAyMC0wNy0xM1QxMToxMDowMHwwMnxNWE58TVhOfDEwMDB8MDE0OTYyMnxCQlZBIEJBTkNPTUVSIFMuQS58MDA0NDIzNTI1MTZ8MDE3OTYzNjg1NjYKRG9jdG9zcmVsYWNpb25hZG9zCkRvY3RvcmVsYWNpb25hZG98MzljMmNm");
        
    }
    
    
    fs.readFile('./../log-especifico.txt','utf8',(err,archivo)=>{
        if(err){
            return res.send('err');
        }
        let log= archivo.split('\n').join('<hr><br>')
        return res.send(log);
    })
}
