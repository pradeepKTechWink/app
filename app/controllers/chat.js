const dotenv = require('dotenv');
const Chat = require('../services/Chat')
const Documents = require('../services/Documents')
const Community = require('../services/Community')
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

class ChatController {
    static createNewChat(request, response) {
        const chat = new Chat(knex)

        chat.createNewChat(process.env.DEFAULT_CHAT_NAME, request.decoded.userId, request.body.communityId)
        .then((chatId) => {
            chat.getChatHistoriesForUserByCommunity(request.decoded.userId, request.body.communityId)
            .then((userChatHistories) => {
                return response.status(201)
                    .send({ success: true, userChatHistories, activeChatId: chatId });
            })
            .catch((err) => {
                return response.status(201)
                    .send({ success: false, message: 'Chat history updated successfully, but failed to fetch updated data, please refresh the page' });
            })
        })
        .catch((err) => {
            return response.status(201)
            .send({ success: false }); 
        })
    }

    static addMessageToConversation(request, response) {
        const chat = new Chat(knex)
        const documents = new Documents(knex)
        const community = new Community(knex)

        chat.addMessagesToTheChatHistory(request.body.chatId, request.body.message, 'user', null)
        .then((parentId) => {
            community.getCommunityAlias(request.body.communityId)
            .then((alias) => {
                documents.queryIndex(
                    alias,
                    parentId,
                    request.body.chatId,
                    request.body.message
                )
                .then((messageId) => {
                    chat.getChatMessageById(messageId)
                    .then((message) => {
                        return response.status(201)
                            .send({ success: true, message });
                    })
                    .catch((err) => {
                        console.log(err)
                        return response.status(201)
                            .send({ success: false });
                    })
                })
                .catch((err) => {
                    console.log(err)
                    return response.status(201)
                        .send({ success: false }); 
                })
            })
            .catch((err) => {
                console.log(err)
                return response.status(201)
                    .send({ success: false }); 
            })
        })
        .catch((err) => {
            console.log(err)
            return response.status(201)
                .send({ success: false }); 
        })
    }

    static retrieveChatMessages(request, response) {
        const chat = new Chat(knex)
        chat.getChatMessages(request.body.chatId)
        .then((chatMessages) => {
            return response.status(201)
                .send({ success: true, chatMessages });
        })
        .catch((err) => {
            return response.status(201)
            .send({ success: false }); 
        })
    }

    static getChatHistoriesForUserByCommunity(request, response) {
        const chat = new Chat(knex)
        chat.getChatHistoriesForUserByCommunity(request.body.userId, request.body.communityId)
        .then((userChatHistories) => {
            return response.status(201)
                .send({ success: true, userChatHistories });
        })
        .catch((err) => {
            console.log(err)
            return response.status(201)
                .send({ success: false });
        })
    }

    static renameChatHistory(request, response) {
        const chat = new Chat(knex)
        chat.renameChat(request.body.chatId, request.body.newChatName)
        .then((res) => {
            if(res == 1) {
                chat.getChatHistoriesForUserByCommunity(request.decoded.userId, request.body.communityId)
                .then((userChatHistories) => {
                    return response.status(201)
                        .send({ success: true, userChatHistories, message: 'Chat history updated successfully' });
                })
                .catch((err) => {
                    return response.status(201)
                        .send({ success: false, message: 'Chat history updated successfully, but failed to fetch updated data, please refresh the page' });
                })
            } else {
                return response.status(201)
                    .send({ success: false, message: 'Failed to update the chat history' });
            }
        })
        .catch((err) => {
            return response.status(201)
                .send({ success: false, message: 'Failed to update the chat history' });
        })
    }

    static deleteChatHistory(request, response) {
        const chat = new Chat(knex)
        chat.deleteChatHistory(request.body.chatId)
        .then((res) => {
            chat.getChatHistoriesForUserByCommunity(request.decoded.userId, request.body.communityId)
            .then((userChatHistories) => {
                return response.status(201)
                    .send({ success: true, userChatHistories, message: 'Chat history deleted successfully' });
            })
            .catch((err) => {
                return response.status(201)
                    .send({ success: false, message: 'Chat history deleted successfully, but failed to fetch updated data, please refresh the page' });
            })
        })
        .catch((err) => {
            console.log(err)
            return response.status(201)
                .send({ success: false, message: 'Failed to delete the chat history' });
        })
    }
}

module.exports = ChatController