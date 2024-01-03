const express = require('express');
const router = express.Router()
const ChatController = require('../controllers/chat')
const auth = require('../middleware/authenticate')

router.route('/chat/create')
    .post(auth.verifyToken, auth.communityExists, auth.isMemberOfCommunity, ChatController.createNewChat)

router.route('/chat/get-histories')
    .post(auth.verifyToken, auth.userExists, auth.isSenderOwner, auth.communityExists, auth.isMemberOfCommunity, ChatController.getChatHistoriesForUserByCommunity)

router.route('/chat/rename')
    .post(auth.verifyToken, auth.communityExists, auth.isMemberOfCommunity, auth.isChatIdExist, auth.isChatIdBelongsToCommunity, auth.isChatCreator, ChatController.renameChatHistory)

router.route('/chat/delete')
    .post(auth.verifyToken, auth.communityExists, auth.isMemberOfCommunity, auth.isChatIdExist, auth.isChatIdBelongsToCommunity, auth.isChatCreator, ChatController.deleteChatHistory)

router.route('/chat/get-messages')
    .post(auth.verifyToken, auth.isChatIdExist, auth.isChatCreator, ChatController.retrieveChatMessages)

router.route('/chat/add-message')
    .post(auth.verifyToken, auth.communityExists, auth.isMemberOfCommunity, auth.isChatIdExist, auth.isChatIdBelongsToCommunity, auth.isChatCreator, ChatController.addMessageToConversation)

module.exports = () => router;

