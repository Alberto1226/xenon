export let llaves = {
  mongodb: {
    user: 'adminBeto',
    password: '1111',
    server: 'localhost',
    database: 'xenon-y-mas-app',
    puerto: 27017,
  }
}




export function devolver_nombre_db() {
  if (process.env.DB == "xenon-y-mas-app") {
    return "san juan";
  }
  else if (process.env.DB == "xenon_dos") {
    return "dos";
  }
  else if (process.env.DB == "xenon_cdmex") {
    return "mx";
  }

  else if (process.env.DB == "xenon_queretaro") {
    return "queretaro";
  }
  else if (process.env.DB == "xenon_tabasco") {
    return "tabasco";
  }

  else if (process.env.DB == "xenon_monterrey") {
    return "monterrey";
  }

}




export function devolver_db() {

  switch (process.env.DB) {
    case "xenon-y-mas-app":
      return {
        llaves: {
          mongodb: {
            user: 'adminBeto',
            password: '1111',
            server: 'localhost',
            database: 'xenon-y-mas-app',
            puerto: 27017,
          }
        }
      }
      break;

    default:
      break;
  }

}



/*db.createUser(
   {
     user: "usuarioAppXenonyMas",
     pwd: "bravo-coca-loma-terra-sierra#-1",
     roles: [ "readWrite", "dbAdmin" ]
   }
)*/


