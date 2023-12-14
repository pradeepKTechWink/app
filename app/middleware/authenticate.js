const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Users = require('../services/Users');
const Chat = require('../services/Chat');
const Documents = require('../services/Documents')
const user = require('../routes/user');
const winston = require('winston');
const { combine, timestamp, json } = winston.format;

dotenv.config();

const secret = process.env.TOKEN_SECRET;

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

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(timestamp(), json()),
    transports: [
      new winston.transports.File({
        filename: process.env.LOG_FILE_PATH,
      }),
    ],
});

const Auth = {
    
    verifyToken(request, response, next) {
        logger.info(`Extracting auth token from request`)
        let bearerToken = request.headers['authorization'];

        if (!bearerToken) {
            logger.warn(`No auth token present in the request`)
            return response.status(401)
            .send({ message: 'No token supplied' });
        }

        let _bearerToken = bearerToken.split(' ')
        let token = _bearerToken[1]
        
        logger.info(`Verifying auth token: ${token}`)
        jwt.verify(token, secret, (err, decoded)=>{
            console.log(token, err, decoded, 'token');
        });

        jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                console.log(err)
                logger.warn('Invalid token or expired token')
                logger.error(err)
                logger.debug(JSON.stringify({ message: 'Token Invalid' }))
                return response.status(401)
                    .send({ message: 'Token Invalid' });
            }
            logger.info(`Token valid`)
            request.decoded = decoded;
            return next();
        });
    },

    adminAccess(request, response, next) {
        const user = new Users(knex)

        user.getCompanyRoleForUser(
            request.decoded.userId,
            request.decoded.company
        )
        .then((role) => {
            if(role == 1) {
                return next()
            } else {
                logger.debug(JSON.stringify( { message: 'Access Denied' } ))
                return response.status(401)
                    .send({ message: 'Access Denied' });
            }
        })
        .catch((err) => {
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            logger.error(err)
            return response.status(401)
                .send({ message: 'Access Denied' });
        })
    },

    onlyAdminOrUser(request, response, next) {
        const user = new Users(knex)

        user.getCompanyRoleForUser(
            request.decoded.userId,
            request.decoded.company
        )
        .then((role) => {
            if(role == 1 || role == 2) {
                return next()
            } else {
                logger.debug(JSON.stringify( { message: 'Access Denied' } ))
                return response.status(401)
                    .send({ message: 'Access Denied' });
            }
        })
        .catch((err) => {
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            return response.status(401)
                .send({ message: 'Access Denied' });
        })
    },

    isCompanyUser(request, response, next) {
        const user = new Users(knex)

        user.getCompanyRoleForUser(
            request.decoded.userId,
            request.decoded.company
        )
        .then((role) => {
            if(role && role == 1 || role == 2 || role == 3) {
                return next()
            } else {
                logger.debug(JSON.stringify( { message: 'Access Denied' } ))
                return response.status(401)
                    .send({ message: 'Access Denied' });
            }
        })
        .catch((err) => {
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            return response.status(401)
                .send({ message: 'Access Denied' });
        })
    },

    isChatCreator(request, response, next) {
        const chat = new Chat(knex)

        chat.getChatHistoryData(request.body.chatId)
        .then((historyData) => {
            if(historyData.userId == request.decoded.userId) {
                return next()
            } else {
                logger.debug(JSON.stringify( { message: 'Access Denied' } ))
                return response.status(401)
                    .send({ message: 'Access Denied' });
            }
        })
        .catch((err) => {
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            return response.status(401)
                .send({ message: 'Access Denied' });
        })
    },

    checkForDuplicateFile(request, response, next) {
        const documents = new Documents(knex)

        logger.info(`Check if file is duplicate`)
        documents.checkIfFileNameExistUnderParentId(
            request.query.fileName,
            request.query.parentId,
            request.query.communityId
        )
        .then((res) => {
            if(res == 1) {
                logger.warn(`Upload failed due to duplicate file`)
                response.writeHead(200, {
                    'Content-Type': 'text/plain; charset=us-ascii',
                    'X-Content-Type-Options': 'nosniff'
                });
                response.write(`0&%&File ${request.query.fileName} already exists under current folder$`)
                response.end()
            } else {
                return next()
            }
        })
    }
};

module.exports = Auth;