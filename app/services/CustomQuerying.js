const OpenAI = require("openai");
const { PineconeStore } = require("langchain/vectorstores/pinecone");
const { Pinecone } = require("@pinecone-database/pinecone");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const Chat = require('./Chat')
const dotenv = require('dotenv');
const winston = require('winston');
const { combine, timestamp, json } = winston.format;
dotenv.config();

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(timestamp(), json()),
    transports: [
      new winston.transports.File({
        filename: process.env.LOG_FILE_PATH,
      }),
    ],
});

class CustomQuerying {

    constructor(dbConnection) {
        this.dbConnection = dbConnection
    }

    async isFlaggedContent (userQuery) {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const moderation = await openai.moderations.create({ input: userQuery });
        return moderation.results[0].flagged
    }
    
    async getRelevantDocs (userQuery, namespace) {
        const client = new Pinecone();
        const pineconeIndex = client.Index(process.env.PINECONE_INDEX);
        const vectorStore = await PineconeStore.fromExistingIndex(
            new OpenAIEmbeddings(),
            { pineconeIndex, namespace },
        );
        const retriever = vectorStore.asRetriever(10)
    
        const relevantDocs = retriever.getRelevantDocuments(userQuery)
        return relevantDocs
    }
    
    extractDocs(sourceDocs) {
        let docs = []
        sourceDocs.map((sourceDoc) => {
            docs.push(sourceDoc.pageContent)
        })
        return docs
    }
    
    buildPrompt(docs, question, pastMessages) {
        const prompt = `
        Use the following pieces of context to answer the users question.
        If you don't know the answer from the given context, just apologise 
        and say that you don't know, don't try to make up an answer from 
        outside the context. You can also refer chat history for answers.
            
        Context section:
        ${docs.join("\n---\n")}

        Chat History:
        ${pastMessages.join("\n")}

        Question: """
        ${question}
        """
        `;
    
        return prompt
    }

    getPastMessages(chatId) {
        return new Promise((resolve, reject) => {
            const chat = new Chat(this.dbConnection)
            chat.getChatMessagesForAIQuery(chatId)
            .then((messages) => {
                let pastMessages = []
                for (const message of messages) {
                    if(message.role == 'user') {
                        pastMessages.push(`Human: ${message.message}`)
                    } else if(message.role == 'bot') {
                        pastMessages.push(`AI: ${message.message}`)
                    }
                }
                resolve(pastMessages)
            })
            .catch((err) => {
                reject(err)
            })
        })
    }
    
    
    async queryIndexByCustomQuerying(query, namespace, chatId) {
        logger.info(`Checking if the query is flagged`)
        if(await this.isFlaggedContent(query)) {
            logger.warn(`Query flagged under OpenAI policy`)
            return {
                result: "This question violates the OpenAI policy",
                sourceDocuments: []
            }
        }
        logger.info(`Fetching relevant docs for the query from vector database`)
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const relevantDocs = await this.getRelevantDocs(query, namespace)
        logger.info(`Relevant docs fetched for the query from vector database`)
        logger.info(`Building prompt for OpenAI API request with relevant context`)
        const context = this.extractDocs(relevantDocs)
        const pastMessages = await this.getPastMessages(chatId)
        const prompt = this.buildPrompt(context, query, pastMessages)

        logger.info(`Prompt building success`)
        logger.info(prompt)

        const completion = await openai.chat.completions.create({
            model: process.env.CHAT_MODEL,
            messages: [
                {"role": "system", "content": prompt},
                {"role": "user", "content": query},
            ],
            max_tokens: 512,
            temperature: 0,
            stream: false,
        });

        logger.info(JSON.stringify(completion.choices[0]))
        
        return {
            result: completion.choices[0].message.content,
            sourceDocuments: relevantDocs
        }
    }
}

module.exports = CustomQuerying