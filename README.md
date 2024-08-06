Hello World

//----------------------------------------------------------------------------------------------
vista creada en la db para el uso en la funcion de consulta en los pedidos historicos

db.createView(
    "vistaPedidosDatos",
    "pedidos",
    [
        {
            $project: {
                folio: 1,
                fecha: 1,
                "usuario_que_registro.usuario": 1,
                tenia_ficha: 1,
                moneda: 1,
                descuento: 1,
                total_pedido: 1,
                "cliente.nombre": 1,
                "cliente.correo": 1,
                "agente.nombre": 1,
                "agente.correo": 1,
                mensajeria: 1,
                lista: {
                    cantidad: 1,
                    "producto.nombre": 1,
                    "producto.descripcion": 1,
                    "producto.precio": 1
                }
            }
        }
    ]
);
/------------------------------------------------------------------------------------------------