const express = require('express');
const router = express.Router()
const ChatController = require('../controllers/chat')
const auth = require('../middleware/authenticate')

router.route('/chat/create')
    .post(auth.verifyToken, auth.isCompanyUser, ChatController.createNewChat)

router.route('/chat/get-histories')
    .post(auth.verifyToken, auth.isCompanyUser, ChatController.getChatHistoriesForUserByCommunity)

router.route('/chat/rename')
    .post(auth.verifyToken, auth.isCompanyUser, auth.isChatCreator, ChatController.renameChatHistory)

router.route('/chat/delete')
    .post(auth.verifyToken, auth.isCompanyUser, auth.isChatCreator, ChatController.deleteChatHistory)

router.route('/chat/get-messages')
    .post(auth.verifyToken, auth.isCompanyUser, auth.isChatCreator, ChatController.retrieveChatMessages)

router.route('/chat/add-message')
    .post(auth.verifyToken, auth.isCompanyUser, auth.isChatCreator, ChatController.addMessageToConversation)

module.exports = () => router;

