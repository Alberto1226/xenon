

export async function mandar_email(cliente) {
  /*
  var solicitud ={
    nombre:"Fernando DAniel",
    correo:"raffert86@gmail.com",
    password:"1234567891"
  }
  */
 const imagenes_url = __dirname.replace('/__sapper__/dev/server','/static/imagenes/');

 
  const contenido= await llenar_email(cliente)
  const mailOptions = {
    from: "Xenon y mas <noreply@xenonymas.com.mx>",
    to: cliente.correo,
    subject: "Bienvenid@ a nuestro equipo !" ,
    html: contenido,
    attachments: [
      {
        filename: "logotipo.png",
        path: imagenes_url+'logo-xenon.png',
        cid: 'logotipo@xenonymas.com.mx' 
      },
      {
        filename: "qr_url.png",
        path: imagenes_url+'qr_url_xenonymas.png',
        cid: 'qr_url@xenonymas.com.mx' 
      },
      {
        filename: "login.png",
        path: imagenes_url+'login.png',
        cid: 'login@xenonymas.com.mx' 
      }
    ]
  };
    
    return mailTransport
    .sendMail(mailOptions)
    .then(() => {
      //console.log("Nuevo email enviado a :", carrito.cliente.correo);
      console.log("correo enviado a cliente");
      //res.send("Enviado")
      return;
    })
    .catch((error) => {
      console.error(error);
      //res.send(error)      
      return;
    });
}




async function  llenar_email(cliente) {
  return `
  <head>
  <link rel="preconnect" href="https://fonts.gstatic.com">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300&display=swap" rel="stylesheet"> 
      <style>  
      body{
        font-family: 'Roboto', sans-serif;
      }
        .texto_color{
          color:#1e1e1e
        }
        .centrado{
          text-align:center
        }
        .banner-superior{
          height: 82px;
          background: #1e1e1e;
          color: white;
          font-size: 20px;
        }
        .marca{
          text-align: center;
          padding-top: 21px;
        }
        .rojo{
            color:red;
            
        }
        .letritas{
            font-size: 10px;
        }
        .contactanos{
            /* margin-top: 20px; */
            display: flex;
            text-align: center;
            background: red;
            color: white;
            padding: 30px 0;
        }
        .te-agradecemos{
            text-align: center;
            margin: 66px 0;
        }
        .prefin{
            text-align: center;
            padding: 62px;
            background: beige;
        }

        .col50{
            width: 50%;
        }
        .margen-auto{
            margin: auto;
        }
        .izquierda{
            text-align: right;
            padding-right: 30px;
        }
        .derecha{
            text-align: left;
            padding-left: 30px;
        }
        .imagen{
          width: 80%;
          max-width: 607px;
        }
        .imagen_qr{
          margin-top:30px;
          margin-bottom:30px;
          width: 80%;
          max-width: 200px;
        }
        .imagen_login{

          margin-top:30px;
          margin-bottom:30px;
          width: 80%;
          max-width: 300px;
        }
        .boton-comenzar{
          padding: 15px;
          height: 70px;
          width: 150px;
          border-radius: 30px;
          background-color: white;
          border:1px solid rgb(0, 123, 224);
          color: rgb(0, 123, 224);
          font-size: 20px;
          text-decoration-line: none;
        }

        .boton-comenzar:hover{
          background-color: rgb(44, 160, 255);
        }

        .boton-div{
          margin-top: 100px;
          margin-bottom: 35px;
        }
        .link-face{
          font-weight: 800;
        }
        </style>
</head>
<body>
   
    <div class="banner-superior">
      <div class="marca">
        <span class="rojo">X</span>enon y más <br>
        <span class="letritas">xenonymas.com.mx</span>
      </div>
    </div>
    <h1 class="texto_color centrado">Hola ${cliente.nombre} !</h1>
    <div class="te-agradecemos"> 
    <img class="imagen" src="cid:logotipo@xenonymas.com.mx"/> <br>
    Bienvenid@ a nuestro equipo .
    </div>

    <div class="prefin">
       Ya puedes comenzar a levantar pedidos en la app con el correo <b> ${cliente.correo} </b> y tu password.

     <div class="centrado boton-div">
       <a class="boton-comenzar" target="_blank" href="https://www.xenonymas.com.mx">
         Comenzar</a>

         o usa el siguiente código QR <br>
         <img class="imagen_qr" src="cid:qr_url@xenonymas.com.mx"/> 
          <br>
         <img class="imagen_login" src="cid:login@xenonymas.com.mx"/> 


     </div>




    </div>

    <div class="contactanos">
        <div class="col50 margen-auto izquierda">
            <a class="link-face" target="_blank" href="https://www.facebook.com/XenonYmasSJR/#" >
                En facebook</a>
        </div>
        <br>
           <div class="col50 derecha"> O a los Teléfonos:

            <li>
              800 161 6159 <br></li> <li>
              01 427 129 09 06 <br></li> <li>
              01 427 272 38 14 <br></li> <li>
              01 427 274 65 55<br></li>
            </div>
    </div>
  
    </body>
  `
}

/*
nombre:'nombre',
    correo:'fer.rafful@protonmail.com',
    fecha:'',
    telefono:'442136522',
    password:'123456789',
    password2:'123456789',
    calle:'calle tal ',
    entre_calle:"entre calle",
    y_calle:"y calle",
    no_ext:'no exteriro',
    no_int:'no interior',
    colonia:'colo',
    localidad:'local lidad',
    municipio:'Asientos',
    estado:'Aguascalientes',
    cp:'',
    paso_1_ok:false,
    paso_2_ok:false,
    actualizar_municipio:true,
    token:""
*/


var nodemailer = require("nodemailer");

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

  

  