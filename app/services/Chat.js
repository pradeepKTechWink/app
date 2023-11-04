class Chat {
    constructor(dbConnection) {
        this.dbConnection = dbConnection
    }

    createNewChat(chatName, userId, communityId) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection("chat_histories")
            .insert({
                userId,
                communityId,
                name: chatName,
                created: dateTime
            })
            .then((chatId) => {
                resolve(chatId[0])
            })
            .catch((err) => {
                reject(err)
            })
        })
    }

    renameChat(chatId, newChatName) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_histories")
            .update({ 
                name: newChatName
             })
             .where({ id: chatId })
             .then((res) => {
                resolve(res)
             })
             .catch((err) => {
                reject(err)
             })
        })
    }

    addMessagesToTheChatHistory(chatId, message, messageType, parent) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection("chat_messages")
            .insert({
                chatId,
                message,
                role: messageType,
                parent,
                created: dateTime
            })
            .then((chatMessageId) => {
                resolve(chatMessageId[0])
            })
            .catch((err) => {
                reject(err)
            })
        })
    }

    async addAIReplyToUserQueries(userQueries, aiQueries) {
        let finalResults = []
        console.log(userQueries)
        for (const userQuery of userQueries) {
            let temp = {}
            temp.userQuery = userQuery.message
            let replyData = await aiQueries.find((queryData) => queryData.parent == userQuery.id)
            if(replyData) {
                temp.aiAnswer = replyData.message
            }
            finalResults.push(temp)
        }
        return finalResults
    }

    async extractAIAnswers(messages) {
        const aiAnswers = messages.filter((message) => {
            if(message.role == 'bot') {
                return message
            }
        })
        return aiAnswers
    }

    async extractUserQueries(messages) {
        const userQueries = messages.filter((message) => {
            if(message.role == 'user') {
                return message
            }
        })
        return userQueries
    }

    getChatMessagesForHistory(chatId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_messages")
            .select("*")
            .where({ chatId })
            .then(async (chatMessagesList) => {
                const userQueries = await this.extractUserQueries(chatMessagesList)
                const aiAnswers = await this.extractAIAnswers(chatMessagesList)
                const chatHistories = await this.addAIReplyToUserQueries(userQueries, aiAnswers)
                resolve(chatHistories)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    getChatMessages(chatId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_messages")
            .select("*")
            .where({ chatId })
            .then((messages) => {
                resolve(messages)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    getChatMessageById(messageId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_messages")
            .select("*")
            .where({ id: messageId })
            .then((message) => {
                resolve(message[0])
            })
            .catch((err) => {
                reject(err)
            })
        })
    }

    getChatHistoriesForUserByCommunity(userId, communityId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_histories")
            .select('*')
            .where({ userId })
            .andWhere({ communityId })
            .orderBy('created', 'desc')
            .then((chatHistories) => {
                resolve(chatHistories)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    getChatHistoryData(chatId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_histories")
            .select("*")
            .where({ id: chatId })
            .then((historyData) => {
                resolve(historyData[0])
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    deleteChatHistory(chatId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_histories")
            .where({ id: chatId })
            .del()
            .then((res) => {
                resolve(res)
            })
            .catch((err) => {
                console.log(err)
            })
        })
    }
}

module.exports = Chat