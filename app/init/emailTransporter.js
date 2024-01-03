const SuperAdmin = require('../services/SuperAdmin')
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const path = require('path')
dotenv.config();

const knex = require('knex')({
    client: 'mysql',
    connection: {
      host : process.env.DATABASE_HOST,
      port : process.env.DATABASE_PORT,
      user : process.env.DATABASE_USER_NAME,
      password : process.env.DATABASE_PASSWORD ? process.env.DATABASE_PASSWORD : '',
      database : process.env.DATABASE_NAME
    }
});

exports.emailTransporter = () => {
    return new Promise( async (resolve, reject) => {
        try {
            const superAdmin = new SuperAdmin(knex)

            let isServiceBased = null
            let host = null
            let port = null
            let mailAddress = null
            let mailPassword = null

            if(process.env.CACHE_MODE == 'enabled') {
                const settings = await superAdmin.getDataFromRedis(process.env.REDIS_SUPER_ADMIN_SETTINGS_KEY)
            
                isServiceBased = settings["isServiceBased"]
                host = settings["emailHost"]
                port = settings["emailPort"]
                mailAddress = settings["mailAddress"]
                mailPassword = settings["maillPassword"]
            } else {
                const isServiceBasedFull = await superAdmin.getSettings("isServiceBased")
                const hostFull = await superAdmin.getSettings("emailHost")
                const portFull = await superAdmin.getSettings("emailPort")
                const mailAddressFull = await superAdmin.getSettings("mailAddress")
                const mailPasswordFull = await superAdmin.getSettings("maillPassword")

                isServiceBased = isServiceBasedFull[0]["meta_value"]
                host = hostFull[0]["meta_value"]
                port = portFull[0]["meta_value"]
                mailAddress = mailAddressFull[0]["meta_value"]
                mailPassword = mailPasswordFull[0]["meta_value"]
            }
            
            let transporter = null
           
            if(isServiceBased == '0') {
                transporter = nodemailer.createTransport(
                    {
                        host: host,
                        port: port,
                        secure: true,
                        authMethod: 'LOGIN',
                        auth:{
                            user: mailAddress,
                            pass: mailPassword
                        },
                        connectionTimeout: 10000, 
                        greetingTimeout: 3000,    
                        socketTimeout: 20000
                    }
                );
            } else {
                transporter = nodemailer.createTransport(
                    {
                        service: host,
                        auth:{
                            user: mailAddress,
                            pass: mailPassword
                        }
                    }
                );
            }

            const handlebarOptions = {
                viewEngine: {
                    partialsDir: path.resolve('./views/'),
                    defaultLayout: false,
                },
                viewPath: path.resolve('./views/'),
            };
            
            transporter.use('compile', hbs(handlebarOptions))

            resolve({
                transporter,
                mailingAddress: mailAddress
            })
        } catch (error) {
            console.log(error)
            reject(error)
        }
    })
}