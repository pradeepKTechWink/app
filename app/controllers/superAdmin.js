const SuperAdmin = require('../services/SuperAdmin')
const winston = require('winston');
const { combine, timestamp, json } = winston.format;
const dotenv = require('dotenv');
const { loadDataToRedis } = require('../init/redisUtils')
dotenv.config();

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(timestamp(), json()),
    transports: [
        new winston.transports.File({
            filename: process.env.LOG_FILE_PATH,
        }),
    ],
});

const knex = require('knex')({
    client: 'mysql',
    connection: {
        host: process.env.DATABASE_HOST,
        port: process.env.DATABASE_PORT,
        user: process.env.DATABASE_USER_NAME,
        password: process.env.DATABASE_PASSWORD ? process.env.DATABASE_PASSWORD : '',
        database: process.env.DATABASE_NAME
    }
});

class SuperAdminController {

    static getRoles(request, response) {
        const superAdmins = new SuperAdmin(knex)
        superAdmins.getUserRole(request.body.userId)
            .then((res) => {
                if (res == 4) {
                    logger.error('Fetching super admin role');
                    response.status(200).send({ status: true })
                } else {
                    logger.error('Error fetching super admin role');
                    response.status(403).send({ status: false })
                }
            })
            .catch((err) => {
                logger.error('Error fetching user role:', err);
                response.status(500).send('Internal Server Error');
            })
    }

    static getENV(request, response) {
        const superAdmins = new SuperAdmin(knex)
        superAdmins.getAdminENV()
            .then((env) => {
                return response.status(201)
                    .send({ success: true, env });
            })
            .catch((err) => {
                return response.status(201)
                    .send({ success: false });
            })
    }

    static updateENV(request, response) {
        const superAdmins = new SuperAdmin(knex)
        superAdmins.updateAdminENV(request.body)
            .then(async (env) => {
                if(process.env.CACHE_MODE == 'enabled') {
                    console.log('Resetting cache')
                    await loadDataToRedis()
                }
                return response.status(200)
                    .send({ success: true, message: 'Environment variables updated successfully' });
            })
            .catch((err) => {
                return response.status(201)
                    .send({ success: false, message: 'Failed to update environment variables' });
            })
    }
}

module.exports = SuperAdminController