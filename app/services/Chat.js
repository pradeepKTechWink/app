const { getNoOfPreviousConversationToPass } = require("../init/redisUtils")

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

    addMessagesToTheChatHistory(chatId, message, messageType, parent, source) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection("chat_messages")
            .insert({
                chatId,
                message,
                source,
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

    getNoOfPastMessageToBeAdded() {
        return new Promise(async (resolve, reject) => {
            // const superAdmin = new SuperAdmin(this.dbConnection)
            // superAdmin.getDataFromRedis(process.env.REDIS_SUPER_ADMIN_SETTINGS_KEY)
            // .then((setting) => {
            //     resolve(setting['conversationNumberToPass'])
            // })
            // .catch((err) => {
            //     console.log(err)
            //     reject(err)
            // })
            try {
                const numb = await getNoOfPreviousConversationToPass()
                console.log(numb)
                resolve(numb)
            } catch (error) {
                reject(error)
            }
        })
    }

    getChatMessagesForHistory(chatId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_messages")
            .select("*")
            .where({ chatId })
            .then(async (chatMessagesList) => {
                this.getNoOfPastMessageToBeAdded()
                .then(async (noOfPastMessageToAdd) => {
                    const listLastIndex = chatMessagesList.length - 1
                    const filteredConversation = chatMessagesList.slice(listLastIndex - parseInt(noOfPastMessageToAdd), listLastIndex + 1)
                    const userQueries = await this.extractUserQueries(filteredConversation)
                    const aiAnswers = await this.extractAIAnswers(filteredConversation)
                    const chatHistories = await this.addAIReplyToUserQueries(userQueries, aiAnswers)
                    console.log('History Length', chatHistories.length)
                    resolve(chatHistories)
                })
                .catch((err) => {
                    reject(err)
                })
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

    getChatMessagesForAIQuery(chatId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_messages")
            .select("*")
            .where({ chatId })
            .then((messages) => {
                this.getNoOfPastMessageToBeAdded()
                .then((noOfPastMessageToAdd) => {
                    const listLastIndex = messages.length - 1
                    const filteredMessages = messages.slice(listLastIndex - parseInt(noOfPastMessageToAdd), listLastIndex)
                    resolve(filteredMessages)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
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

    doesChatIdExists(chatId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_histories")
            .select("*")
            .where({ id: chatId })
            .then((historyData) => {
                if(historyData.length > 0) {
                    resolve('exists')
                } else {
                    resolve('not-exists')
                }
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    doesChatIdExistsInCommunity(chatId, communityId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("chat_histories")
            .select("*")
            .where({ id: chatId })
            .andWhere({ communityId })
            .then((historyData) => {
                if(historyData.length > 0) {
                    resolve('exists')
                } else {
                    resolve('not-exists')
                }
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