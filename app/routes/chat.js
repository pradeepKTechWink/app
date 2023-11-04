const express = require('express');
const router = express.Router()
const ChatController = require('../controllers/chat')
const auth = require('../middleware/authenticate')

router.route('/create-new-chat')
    .post(auth.verifyToken, auth.isCompanyUser, ChatController.createNewChat)

router.route('/get-chat-histories')
    .post(auth.verifyToken, auth.isCompanyUser, ChatController.getChatHistoriesForUserByCommunity)

router.route('/rename-chat-history')
    .post(auth.verifyToken, auth.isCompanyUser, auth.isChatCreator, ChatController.renameChatHistory)

router.route('/delete-chat-history')
    .post(auth.verifyToken, auth.isCompanyUser, auth.isChatCreator, ChatController.deleteChatHistory)

router.route('/get-chat-messages')
    .post(auth.verifyToken, auth.isCompanyUser, auth.isChatCreator, ChatController.retrieveChatMessages)

router.route('/add-message-to-chat')
    .post(auth.verifyToken, auth.isCompanyUser, auth.isChatCreator, ChatController.addMessageToConversation)

module.exports = () => router;

