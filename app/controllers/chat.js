const dotenv = require('dotenv');
const Chat = require('../services/Chat')
const Documents = require('../services/Documents')
const Community = require('../services/Community')
const winston = require('winston');
const { combine, timestamp, json } = winston.format;
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

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(timestamp(), json()),
    transports: [
      new winston.transports.File({
        filename: process.env.LOG_FILE_PATH,
      }),
    ],
});

class ChatController {
    static createNewChat(request, response) {
        const chat = new Chat(knex)

        logger.debug(JSON.stringify( request ))
        logger.info(`Creating new chat for user Id ${request.decoded.userId}`)
        chat.createNewChat(process.env.DEFAULT_CHAT_NAME, request.decoded.userId, request.body.communityId)
        .then((chatId) => {
            logger.info(`New chat created for user Id ${request.decoded.userId}`)
            logger.info(`Fetching updated chat histories for user Id ${request.decoded.userId}`)
            chat.getChatHistoriesForUserByCommunity(request.decoded.userId, request.body.communityId)
            .then((userChatHistories) => {
                logger.info(`Updated chat histories fetched for user Id ${request.decoded.userId}`)
                logger.debug(JSON.stringify( { success: true, userChatHistories, activeChatId: chatId } ))
                return response.status(201)
                    .send({ success: true, userChatHistories, activeChatId: chatId });
            })
            .catch((err) => {
                logger.warn(`Failed to fetch updated chat hsitories for user Id ${request.decoded.userId}`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false, message: request.t('chatHistoryUpdateSuccessFetchFailed') } ))
                return response.status(201)
                    .send({ success: false, message: request.t('chatHistoryUpdateSuccessFetchFailed') });
            })
        })
        .catch((err) => {
            logger.warn(`Failed to create new chat for user Id ${request.decoded.userId}`)
            logger.debug(JSON.stringify( { success: false } ))
            return response.status(201)
            .send({ success: false }); 
        })
    }

    static addMessageToConversation(request, response) {
        const chat = new Chat(knex)
        const documents = new Documents(knex)
        const community = new Community(knex)

        logger.debug(JSON.stringify( request ))
        logger.info(`Initiating new query for the question ${request.body.message}`)
        logger.info(`Adding user message to chat Id ${request.body.chatId} `)
        chat.addMessagesToTheChatHistory(request.body.chatId, request.body.message, 'user', null)
        .then((parentId) => {
            community.getCommunityAlias(request.body.communityId)
            .then((alias) => {
                logger.info(`User message added, querying the index`)
                documents.queryIndex(
                    alias,
                    parentId,
                    request.body.chatId,
                    request.body.message
                )
                .then((messageId) => {
                    chat.getChatMessageById(messageId)
                    .then((message) => {
                        logger.info(`Query successful with the following answer ${message}`)
                        logger.debug(JSON.stringify( { success: true, message } ))
                        return response.status(201)
                            .send({ success: true, message });
                    })
                    .catch((err) => {
                        logger.warn(`Query successful but failed to retrive AI answer`)
                        logger.error(err)
                        console.log(err)
                        logger.debug(JSON.stringify( { success: false } ))
                        return response.status(201)
                            .send({ success: false });
                    })
                })
                .catch((err) => {
                    console.log(err)
                    logger.warn(`Failed to query the index`)
                    logger.error(err)
                    logger.debug(JSON.stringify( { success: false } ))
                    return response.status(201)
                        .send({ success: false }); 
                })
            })
            .catch((err) => {
                console.log(err)
                logger.warn(`Failed to query the index`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false } ))
                return response.status(201)
                    .send({ success: false }); 
            })
        })
        .catch((err) => {
            console.log(err)
            logger.warn(`Failed to add user message to chat Id ${request.body.chatId}`)
            logger.error(err)
            logger.debug(JSON.stringify( { success: false } ))
            return response.status(201)
                .send({ success: false }); 
        })
    }

    static retrieveChatMessages(request, response) {
        const chat = new Chat(knex)
        logger.debug(JSON.stringify( request ))
        logger.info(`Fetching chat messages for chat Id ${request.body.chatId}`)
        chat.getChatMessages(request.body.chatId)
        .then((chatMessages) => {
            logger.info(`Chat messages fetched successfully for Id ${request.body.chatId}`)
            logger.debug(JSON.stringify( { success: true, chatMessages } ))
            return response.status(201)
                .send({ success: true, chatMessages });
        })
        .catch((err) => {
            logger.warn(`Failed to fetch chat messages for id ${request.body.chatId}`)
            logger.error(err)
            logger.debug(JSON.stringify( { success: false } ))
            return response.status(201)
            .send({ success: false }); 
        })
    }

    static getChatHistoriesForUserByCommunity(request, response) {
        const chat = new Chat(knex)

        logger.debug(JSON.stringify( request ))
        logger.info(`Fetching chat histories for user Id ${request.body.userId}`)
        chat.getChatHistoriesForUserByCommunity(request.body.userId, request.body.communityId)
        .then((userChatHistories) => {
            logger.info(`Chat histories fetched successfully for user Id ${request.body.userId}`)
            logger.debug(JSON.stringify( { success: true, userChatHistories } ))
            return response.status(201)
                .send({ success: true, userChatHistories });
        })
        .catch((err) => {
            console.log(err)
            logger.warn(`Failed fecth chat histories for user Id ${request.body.userId}`)
            logger.error(err)
            logger.debug(JSON.stringify( { success: false } ))
            return response.status(201)
                .send({ success: false });
        })
    }

    static renameChatHistory(request, response) {
        const chat = new Chat(knex)

        logger.debug(JSON.stringify( request ))
        logger.info(`Renaming chat Id ${request.body.chatId}`)
        chat.renameChat(request.body.chatId, request.body.newChatName)
        .then((res) => {
            if(res == 1) {
                logger.info(`Chat history ${request.body.chatId} renamed`)
                logger.info(`Fetching updated chat histories.`)
                chat.getChatHistoriesForUserByCommunity(request.decoded.userId, request.body.communityId)
                .then((userChatHistories) => {
                    logger.info(`Updated chat history fetched successfully`)
                    logger.debug(JSON.stringify( { success: true, userChatHistories, message: request.t('chatHistoryUpdateSuccess') } ))
                    return response.status(201)
                        .send({ success: true, userChatHistories, message: request.t('chatHistoryUpdateSuccess') });
                })
                .catch((err) => {
                    logger.warn(`Failed to fetch updated chat histories`)
                    logger.error(err)
                    logger.debug(JSON.stringify( { success: false, message: request.t('chatHistoryUpdateSuccessFetchFailed') } ))
                    return response.status(201)
                        .send({ success: false, message: request.t('chatHistoryUpdateSuccessFetchFailed') });
                })
            } else {
                logger.warn(`Failed to rename chat history`)
                logger.debug(JSON.stringify( { success: false, message: request.t('chatHistoryUpdateFailed') } ))
                return response.status(201)
                    .send({ success: false, message: request.t('chatHistoryUpdateFailed') });
            }
        })
        .catch((err) => {
            logger.warn(`Failed to rename chat history`)
            logger.error(err)
            logger.debug(JSON.stringify( { success: false, message: request.t('chatHistoryUpdateFailed') } ))
            return response.status(201)
                .send({ success: false, message: request.t('chatHistoryUpdateFailed') });
        })
    }

    static deleteChatHistory(request, response) {
        const chat = new Chat(knex)

        logger.debug(JSON.stringify( request ))
        logger.info(`Deleting chat Id ${request.body.chatId}`)
        chat.deleteChatHistory(request.body.chatId)
        .then((res) => {
            logger.info(`Deleted chat Id ${request.body.chatId}`)
            logger.info(`Fetching updated chat histories`)
            chat.getChatHistoriesForUserByCommunity(request.decoded.userId, request.body.communityId)
            .then((userChatHistories) => {
                logger.info(`Updated chat history fetched successfully`)
                logger.debug(JSON.stringify( { success: true, userChatHistories, message: request.t('chatHistoryDeleteSuccess') } ))
                return response.status(201)
                    .send({ success: true, userChatHistories, message: request.t('chatHistoryDeleteSuccess') });
            })
            .catch((err) => {
                logger.warn(`Failed to fetch updated chat histories`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false, message: request.t('chatHistoryDeleteSuccessFetchFailed') } ))
                return response.status(201)
                    .send({ success: false, message: request.t('chatHistoryDeleteSuccessFetchFailed') });
            })
        })
        .catch((err) => {
            logger.warn(`Failed to delete the chat Id ${request.body.chatId}`)
            logger.error(err)
            console.log(err)
            logger.debug(JSON.stringify( { success: false, message: request.t('chatHistoryDeleteSuccessFailed') } ))
            return response.status(201)
                .send({ success: false, message: request.t('chatHistoryDeleteSuccessFailed') });
        })
    }
}

module.exports = ChatController