const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Users = require('../services/Users');
const Chat = require('../services/Chat');
const user = require('../routes/user');

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

const Auth = {
    
    verifyToken(request, response, next) {
        let bearerToken = request.headers['authorization'];

        if (!bearerToken) {
            return response.status(401)
            .send({ message: 'No token supplied' });
        }

        let _bearerToken = bearerToken.split(' ')
        let token = _bearerToken[1]
        
        jwt.verify(token, secret, (err, decoded)=>{
            console.log(token, err, decoded, 'token');
        });

        jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                console.log(err)
                return response.status(401)
                    .send({ message: 'Token Invalid' });
            }
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
                return response.status(401)
                    .send({ message: 'Access Denied' });
            }
        })
        .catch((err) => {
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
                return response.status(401)
                    .send({ message: 'Access Denied' });
            }
        })
        .catch((err) => {
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
                return response.status(401)
                    .send({ message: 'Access Denied' });
            }
        })
        .catch((err) => {
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
                return response.status(401)
                    .send({ message: 'Access Denied' });
            }
        })
        .catch((err) => {
            return response.status(401)
                .send({ message: 'Access Denied' });
        })
    }
};

module.exports = Auth;