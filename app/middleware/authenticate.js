const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Users = require('../services/Users');
const Chat = require('../services/Chat');
const Documents = require('../services/Documents')
const Community = require('../services/Community')
const user = require('../routes/user');
const winston = require('winston');
const { response } = require('express');
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

        if(request.body.password) {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: {...request.body, password: '**********'},
                headers: request.headers
            }
            logger.debug(JSON.stringify( debugData ))
        } else if(request.body.newPassword || request.body.currentPassword) {
            const hashedPassword = {
                newPassword: '*********',
                currentPassword: '************'
            }
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: {...request.body, ...hashedPassword},
                headers: request.headers
            }
            logger.debug(JSON.stringify( debugData ))
        } else {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: {...request.body},
                headers: request.headers
            }
            logger.debug(JSON.stringify( debugData ))
        }
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

    isSenderOwner(request, response, next) {
        if(request.body.userId == request.decoded.userId) {
            return next()
        } else {
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            return response.status(401)
                .send({ message: 'Access Denied' });
        }
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
            logger.error(err)
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            return response.status(401)
                .send({ message: 'Access Denied' });
        })
    },

    isCompanyUser(request, response, next) {
        const user = new Users(knex)

        user.getCompanyRoleForUser(
            request.decoded.userId,
            request.body.companyId
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
            logger.error(err)
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            return response.status(401)
                .send({ message: 'Access Denied' });
        })
    },

    isMemberOfCommunity(request, response, next) {
        const community = new Community(knex)
        const user = new Users(knex)
        community.getCompanyIdForCommunity(request.body.communityId)
        .then((companyId) => {
            user.getCompanyRoleForUser(
                request.decoded.userId,
                companyId
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
                logger.error(err)
                logger.debug(JSON.stringify( { message: 'Access Denied' } ))
                return response.status(401)
                    .send({ message: 'Access Denied' });
            })
        })
        .catch((err) => {
            logger.error(err)
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            return response.status(401)
                .send({ message: 'Access Denied' });
        })
    },

    isMemberOfCommunityV2(request, response, next) {
        const community = new Community(knex)
        const user = new Users(knex)
        community.getCompanyIdForCommunity(request.query.communityId)
        .then((companyId) => {
            user.getCompanyRoleForUser(
                request.decoded.userId,
                companyId
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
                logger.error(err)
                logger.debug(JSON.stringify( { message: 'Access Denied' } ))
                return response.status(401)
                    .send({ message: 'Access Denied' });
            })
        })
        .catch((err) => {
            logger.error(err)
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            return response.status(401)
                .send({ message: 'Access Denied' });
        })
    },
    
    hasUserEditAccess(request, response, next) {
        const user = new Users(knex)

        user.getCompanyIdForUser(request.body.userId)
        .then((companyId) => {
            user.getCompanyRoleForUser(request.decoded.userId, companyId)
            .then((role) => {
                if(role && role == 1) {
                    return next()
                } else {
                    logger.debug(JSON.stringify( { message: 'Access Denied' } ))
                    return response.status(401)
                        .send({ message: 'Access Denied' });
                }
            })
            .catch((err) => {
                logger.error(err)
                logger.debug(JSON.stringify( { message: 'Access Denied' } ))
                return response.status(401)
                    .send({ message: 'Access Denied' });
            })
        })
        .catch((err) => {
            logger.error(err)
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
            logger.error(err)
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            return response.status(401)
                .send({ message: 'Access Denied' });
        })
    },

    isChatIdExist(request, response, next) {
        const chat = new Chat(knex)
        chat.doesChatIdExists(request.body.chatId)
        .then((res) => {
            if(res == 'exists') {
                return next()
            } else {
                return response.status(401)
                .send({ message: 'Invalid chatId provided' });
            }
        })
        .catch((err) => {
            logger.error(err)
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            return response.status(401)
                .send({ message: 'Access Denied' });
        })
    },

    isChatIdBelongsToCommunity(request, response, next) {
        const chat = new Chat(knex)
        chat.doesChatIdExistsInCommunity(request.body.chatId, request.body.communityId)
        .then((res) => {
            if(res == 'exists') {
                return next()
            } else {
                return response.status(401)
                .send({ message: 'Invalid chat details provided' });
            }
        })
        .catch((err) => {
            logger.error(err)
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
    },

    userExists(request, response, next) {
        const user = new Users(knex)
        user.isUserExist(request.body.userId)
        .then((res) => {
            if(res == 'exists') {
                return next()
            } else {
                return response.status(401)
                .send({ message: 'Invalid userId provided' });
            }
        })
        .catch((err) => {
            logger.error(err)
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            return response.status(401)
                .send({ message: 'Access Denied' });
        })
    },

    userExistsM2(request, response, next) {
        const user = new Users(knex)
        user.isUserExist(request.decoded.userId)
        .then((res) => {
            if(res == 'exists') {
                return next()
            } else {
                return response.status(401)
                .send({ message: 'Invalid userId provided' });
            }
        })
        .catch((err) => {
            console.log(err)
            logger.error(err)
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            return response.status(401)
                .send({ message: 'Access Denied' });
        })
    },

    communityExists(request, response, next) {
        const community = new Community(knex)
        community.getCommunity(request.body.communityId)
        .then((res) => {
            if(res.length > 0) {
                return next()
            } else {
                return response.status(401)
                .send({ message: 'Invalid community Id provided' });
            }
        })
        .catch((err) => {
            console.log()
            logger.error(err)
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            return response.status(401)
                .send({ message: 'Access Denied' });
        })
    },

    companyExist(request, response, next) {
        const user = new Users(knex)
        user.isCompanyExist(request.body.companyId)
        .then((res) => {
            if(res == 'exists') {
                return next()
            } else {
                return response.status(401)
                .send({ message: 'Invalid companyId provided' });
            }
        })
        .catch((err) => {
            logger.error(err)
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            return response.status(401)
                .send({ message: 'Access Denied' });
        })
    },

    isAccountVerified(request, response, next) {
        const user = new Users(knex)
        user.isAccountVerified(request.body.userId)
        .then((res) => {
            if(res == 'verified') {
                return next()
            } else {
                logger.debug(JSON.stringify( { message: 'Account not verified, verify your account to use 2FA' } ))
                return response.status(401)
                    .send({ message: 'Account not verified, verify your account to use 2FA' });
            }
        })
    },

    isUserBelongsToCompany(request, response, next) {
        const user = new Users(knex)
        user.getCompanyIdForUser(request.body.userId)
        .then((companyId) => {
            if(companyId == request.body.companyId) {
                return next()
            } else {
                logger.debug(JSON.stringify( { message: 'Access Denied' } ))
                return response.status(401)
                    .send({ message: 'Access Denied' });
            }
        })
        .catch((err) => {
            logger.error(err)
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            return response.status(401)
                .send({ message: 'Access Denied' });
        })
    },

    isValidParent(request, response, next) {
        const documents = new Documents(knex)
        if(request.body.parentId == 4) {
            return next()
        } else {
            documents.checkIfFolderExistsM2(request.body.parentId, request.body.communityId)
            .then((res) => {
                if(res == 'exists') {
                    return next()
                } else {
                    return response.status(401)
                    .send({ message: 'Invalid parentId provided' });
                }
            })
        }
    },

    isValidFolder(request, response, next) {
        const documents = new Documents(knex)
        documents.checkIfFolderExists(request.body.folderId, request.body.parentId, request.body.communityId)
        .then((res) => {
            if(res == 'exists') {
                return next()
            } else {
                return response.status(401)
                .send({ message: 'Invalid folderId provided' });
            }
        })
    },

    isValidFile(request, response, next) {
        const documents = new Documents(knex)
        documents.checkIfFileIsValid(request.body.fileId, request.body.parentId, request.body.communityId)
        .then((res) => {
            if(res == 'exists') {
                return next()
            } else {
                return response.status(401)
                .send({ message: 'Invalid fileId provided' });
            }
        })
    },

    isValidFileM2(request, response, next) {
        const documents = new Documents(knex)
        documents.checkIfFileIsValidM2(request.body.fileId, request.body.communityId)
        .then((res) => {
            if(res == 'exists') {
                return next()
            } else {
                return response.status(401)
                .send({ message: 'Invalid fileId provided' });
            }
        })
    },

    isValidSenderId(request, response, next) {
        if(request.body.senderId == request.decoded.userId) {
            return next()
        } else {
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            return response.status(401)
                .send({ message: 'Access Denied' });
        }
    },

    isValidCreator(request, response, next) {
        if(request.body.creator == request.decoded.userId) {
            return next()
        } else {
            logger.debug(JSON.stringify( { message: 'Incorrect creator Id provided' } ))
            return response.status(401)
                .send({ message: 'Incorrect creator Id provided' });
        }
    },

    isValidRole(request, response, next) {
        if(request.body.role == 1 || request.body.role == 2 || request.body.role == 3) {
            return next()
        }
        logger.debug(JSON.stringify( { message: 'Invalid Role Id provided' } ))
        return response.status(401)
            .send({ message: 'Invalid Role Id provided' });
    },

    isValidInvitationId(request, response, next) {
        const user = new Users(knex)
        user.isInvitationExist(request.body.invitationId)
        .then((res) => {
            if(res == 'exists') {
                return next()
            } else {
                return response.status(401)
                .send({ message: 'Invalid invitationId provided' });
            }
        })
        .catch((err) => {
            logger.error(err)
            logger.debug(JSON.stringify( { message: 'Access Denied' } ))
            return response.status(401)
                .send({ message: 'Access Denied' });
        })
    },

    isValidFileExtension(request, response, next) {
        if(
            request.body.fileType == "docx" ||
            request.body.fileType == "doc" ||
            request.body.fileType == "xlsx" ||
            request.body.fileType == "xls" ||
            request.body.fileType == "pdf" ||
            request.body.fileType == "txt" ||
            request.body.fileType == "pptx" ||
            request.body.fileType == "html"
        ) {
            return next()
        } else {
            return response.status(401)
                .send({ message: 'Invalid extension provided' });
        }
    }
};

module.exports = Auth;