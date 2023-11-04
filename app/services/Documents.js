var fs = require('fs');
var fs2 = require('fs').promises;
const path = require('path');
const { PDFLoader } = require("langchain/document_loaders/fs/pdf");
const { TokenTextSplitter } = require("langchain/text_splitter");
const { DocxLoader } = require("langchain/document_loaders/fs/docx");
const { TextLoader } = require("langchain/document_loaders/fs/text");
const { CSVLoader } = require("langchain/document_loaders/fs/csv");
const { PineconeStore } = require("langchain/vectorstores/pinecone");
const { PineconeClient } = require("@pinecone-database/pinecone");
const { BufferMemory, ChatMessageHistory } = require("langchain/memory");
const { HumanMessage, AIMessage } = require("langchain/schema");
const { PromptTemplate } = require("langchain/prompts");
const { ChatOpenAI } = require("langchain/chat_models/openai");
const { ConversationalRetrievalQAChain } = require("langchain/chains");
const XLSX = require("xlsx");
var reader = require('any-text');
const officeParser = require('officeparser');
const Community = require('./Community');
const Chat = require("./Chat")
const { embeddings } = require('../init/OpenAIEmbeddings')
const { initVectoreStore } = require('../init/VectorStore')
const dotenv = require('dotenv');
dotenv.config();

class Documents {
    constructor(dbConnection) {
        this.dbConnection = dbConnection
    }

    buildAbsolutePathWithFoldersArray(foldersArray) {
        let _path = `${process.env.DOCUMENT_PATH}/`
        const reversedFolderArray = foldersArray.reverse()
        reversedFolderArray.forEach(folder => {
            if(folder != "Root") {
                _path += folder + '/'
            }
        });
        return path.resolve(_path)
    }

    getPredecessorFolders(folderId) {
        return new Promise(async(resolve, reject) => {
            try {
                let nextParentId = folderId;
                let folderTrace = [];
                while(true) {
                    if(!nextParentId) {
                        resolve(folderTrace.reverse())
                        break
                    }
                    const _data = await this.dbConnection('documents').select('*').where({ id: nextParentId })
                    folderTrace.push(_data[0])
                    nextParentId = _data[0]["parentId"]
                }
            } catch (error) {
                console.log(error)
                reject(error)
            }
        })
    }

    createDefaultFoldersForCommunity(communityAlias, defaultFoldersArray) {
        defaultFoldersArray.forEach(folder => {
            const folderPath = `${process.env.DOCUMENT_PATH}/` + communityAlias + '/' + folder
            if(!fs.existsSync(path.resolve(folderPath))){
                fs.mkdirSync(folderPath, { recursive: true });
            }
        });
    }

    async createCommunityFolder(communityAlias) {
        const folderPath = `${process.env.DOCUMENT_PATH}/` + communityAlias
        if(!fs.existsSync(path.resolve(folderPath))){
            fs.mkdirSync(folderPath, { recursive: true });
        }
    }

    getChildFoldersAndFiles(parentId, communityId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('documents')
            .select('*')
            .where({ parentId })
            .andWhere({ communityId })
            .then((res) => {
                resolve(res)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    getRootFolders(communityId) {
        return new Promise((resolve, reject) => {
            const _data = this.dbConnection('documents')
            .select('*')
            .where({ parentId: 4 })
            .andWhere({ communityId })
            .then((res) => {
                resolve(res)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    getParentId(folderId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('documents')
            .select('parentId')
            .where({ id: folderId })
            .then((res) => {
                resolve(res[0]["parentId"])
            })
            .catch((err) => {
                reject(err)
            })
        })
    }

    createFolder(
        folderName,
        tooltip,
        isDefault,
        parentId,
        communityId
    ) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection('documents')
            .insert({
                parentId,
                communityId,
                name: folderName,
                tooltip,
                isDefault: isDefault == true ? 1 : 0,
                isFile: 0,
                created: dateTime
            })
            .then((folderId) => {
                resolve(folderId)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    createFile(
        fileName,
        parentId,
        communityId
    ) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection('documents')
            .insert({
                parentId,
                communityId,
                name: fileName,
                tooltip: "",
                isDefault: 0,
                isFile: 1,
                created: dateTime
            })
            .then((fileId) => {
                resolve(fileId)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    checkIfFileExists(fileId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
            .select('*')
            .where({ id: fileId })
            .then((res) => {
                if(res.length > 0) {
                    resolve(1)
                } else {
                    resolve(0)
                }
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    isFile(fileName) {
        return fs.lstatSync(fileName).isFile();
    }

    fetchFilesWithinFolder(folderId, communityId) {
        return new Promise(async (resolve, reject) => {
            try {
                let filesToBeDeleted = []
                let contents = await this.getChildFoldersAndFiles(folderId, communityId)
                let foldersToBeQueried = []
                contents.forEach(content => {
                    if(content.isFile == 0) {
                        foldersToBeQueried.push(content)
                    } else {
                        filesToBeDeleted.push(content)
                    }
                });
                contents = foldersToBeQueried

                while(true) {
                    if(contents.length == 0) {
                        break
                    }
                    foldersToBeQueried = []
                    
                    for (const content of contents) {
                        let tempData =  await this.getChildFoldersAndFiles(content.id, content.communityId)
                        for (const _content of tempData) {
                            if(_content.isFile == 0) {
                                foldersToBeQueried.push(_content)
                            } else {
                                filesToBeDeleted.push(_content)
                            }
                        }
                    }
                    contents = foldersToBeQueried
                }
                resolve(filesToBeDeleted)
            } catch (error) {
                reject(error)
            }
        })
    }

    deleteFiles(filesList, communityId) {
        return new Promise((resolve, reject) => {
            const community = new Community(this.dbConnection);
            community.getCommunityAlias(communityId)
            .then(async (alias) => {
                console.log('alias :', alias)
                if(filesList.length > 0) {
                    const folderPath = path.resolve(`${process.env.DOCUMENT_PATH}/${alias}`)
                    for (const file of filesList) {
                        const ext = file.name.split('.').pop()
                        const fileName = file.id + '.' + ext
                        if(fs.existsSync(path.join(folderPath, fileName))) {
                            await fs2.unlink(path.join(folderPath, fileName));
                        }
                    }
                    resolve(1)
                } else {
                    resolve(0)
                }
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    deleteFolderDataFromDatabase(folderId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
            .where({ id: folderId })
            .del()
            .then((res) => {
                resolve(res)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    deleteFolder(folderId, communityId) {
        return new Promise((resolve, reject) => {
            this.fetchFilesWithinFolder(folderId, communityId)
            .then(async (files) => {
                if(files.length > 0) {
                    await this.deleteFiles(files, communityId)
                }
                this.deleteFolderDataFromDatabase(folderId)
                .then((res) => {
                    resolve(1)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
            })
            .catch((err) => {
                console.log(err)
                reject('file-fetch-failed')
            })
        })
    }

    getFolderData(folderId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
            .select('*')
            .where({ id: folderId })
            .then((res) => {
                resolve(res[0])
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    updateFolder(folderId, folderName, folderDescription) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
            .update({ 
                name: folderName,
                tooltip: folderDescription
             })
             .where({ id: folderId })
             .then((res) => {
                if(res == 1) {
                    resolve(1)
                } else {
                    resolve(2)
                }
             })
             .catch((err) => {
                console.log(err)
                reject(err)
             })
        })
    }

    getFileData(fileId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
            .select("*")
            .where({ id: fileId })
            .then((data) => {
                resolve(data[0])
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    deleteFile(fileId, communityId) {
        return new Promise(async (resolve, reject) => {
            const community = new Community(this.dbConnection)
            community.getCommunityAlias(communityId)
            .then(async (alias) => {
                this.getFileData(fileId)
                .then(async (file) => {
                    const folderPath = path.resolve(`${process.env.DOCUMENT_PATH}/${alias}`)
                    const ext = file.name.split('.').pop()
                    const fileName = file.id + '.' + ext
                    if(fs.existsSync(path.join(folderPath, fileName))) {
                        await fs2.unlink(path.join(folderPath, fileName));
                    }
                    await this.deleteFolderDataFromDatabase(fileId)
                    resolve(1)
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

    getDocumentPath(fileId, communityId) {
        return new Promise((resolve, reject) => {
            const community = new Community(this.dbConnection)
            community.getCommunityAlias(communityId)
            .then((alias) => {
                this.getFileData(fileId)
                .then((file) => {
                    const folderPath = path.resolve(`${process.env.DOCUMENT_PATH}/${alias}`)
                    const ext = file.name.split('.').pop()
                    const fileName = file.id + '.' + ext
                    if(fs.existsSync(path.join(folderPath, fileName))) {
                        resolve(path.join(folderPath, fileName))
                    } else {
                        resolve('file-not-found')
                    }
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

    searchFilesAndFolders(searchString, communityId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
            .select("*")
            .where({ communityId })
            .whereLike('name', `%${searchString}%`)
            .then((searchResult) => {
                resolve(searchResult)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    formatFileSize(bytes, decimalPoint) {
        if(bytes == 0) return '0 Bytes';
        const k = 1000,
            dm = decimalPoint || 2,
            sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
            i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    getStorageOccupationDetail(companyId) {
        return new Promise((resolve, reject) => {
            const community = new Community(this.dbConnection)

            community.getAllCommunityList(companyId)
            .then(async (communityList) => {
                const docBasePath = path.resolve(`${process.env.DOCUMENT_PATH}/`)
                let size = 0
                for (const _community of communityList) {
                    const communityAlias = await community.getCommunityAlias(_community.id)
                    const folderPath = path.join(docBasePath, communityAlias)
                    if(fs.existsSync(folderPath)) {
                        const files = await fs2.readdir(folderPath)
                        for (const file of files) {
                            const stat = await fs2.lstat(path.join(folderPath, file))
                            size += stat.size
                        }
                    }
                }
                resolve(this.formatFileSize(size))
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    renameCommunityDirectory(communityId, newAlias) {
        return new Promise((resolve, reject) => {
            const community = new Community(this.dbConnection)
            const docBasePath = path.resolve(`${process.env.DOCUMENT_PATH}/`)

            community.getCommunityAlias(communityId)
            .then(async (oldAlias) => {
                if(oldAlias != newAlias) {
                    await fs2.rename(path.join(docBasePath, oldAlias), path.join(docBasePath, newAlias))
                    resolve(1)
                } else {
                    resolve(1)
                }
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    // ********************************** AI integration ***************************************************

    async createDocumentFromPDF(file) {
        const loader = new PDFLoader(file);

        const splitter = new TokenTextSplitter({
            encodingName: "gpt2",
            chunkSize: 1000,
            chunkOverlap: 50,
        });

        const docs = await loader.loadAndSplit(splitter);

        return docs;
    }

    async createDocumentFromDocx(file) {
        const loader = new DocxLoader(file);
          
        const splitter = new TokenTextSplitter({
            encodingName: "gpt2",
            chunkSize: 1000,
            chunkOverlap: 50,
        });

        const docs = await loader.loadAndSplit(splitter);

        console.log("Docs created")

        return docs;
    }

    async createDocumentFromText(file) {
        const loader = new TextLoader(file);
          
        const splitter = new TokenTextSplitter({
            encodingName: "gpt2",
            chunkSize: 1000,
            chunkOverlap: 50,
        });

        const docs = await loader.loadAndSplit(splitter);

        return docs;
    }

    async createDocumentFromCSV(file) {
        const loader = new CSVLoader(file);
          
        const splitter = new TokenTextSplitter({
            encodingName: "gpt2",
            chunkSize: 1000,
            chunkOverlap: 50,
        });

        const docs = await loader.loadAndSplit(splitter);

        return docs;
    }

    createTempCSVFileForXLSXFile(filePath, fileName, type) {
        return new Promise(async (resolve, reject) => {
            try {
                const inputFilename = path.join(filePath, `${fileName}.${type}`)
                const outputFilename = path.resolve(`${process.env.TMP_CSV_PATH}/${fileName}.csv`)
            
                const workBook = XLSX.readFile(inputFilename);
                await XLSX.writeFile(workBook, outputFilename, { bookType: "csv" })
                resolve(1)
            } catch (error) {
                reject(error)
            }
        })
    }

    async buildTextFileFromString(string, userId, fileName) {
        await fsp.appendFile(`${process.env.TMP_TXT_PATH}/${userId}/${fileName}.txt`, string)
        return path.resolve(`${process.env.TMP_TXT_PATH}/${userId}/${fileName}.txt`)
    }

    extractTextFromDocAndCreateTextFile(filePath, userId, fileName) {
        return new Promise((resolve, reject) => {
            reader.getText(filePath)
            .then(async function (data) {
                await fs2.appendFile(`${process.env.TMP_TXT_PATH}/${userId}/${fileName}.txt`, data)
                const textFilePath = path.resolve(`${process.env.TMP_TXT_PATH}/${userId}/${fileName}.txt`)
                resolve(textFilePath)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    extractTextFromPPTXAndCreateTextFile(filePath, userId, fileName) {
        return new Promise((resolve, reject) => {
            officeParser.parseOffice(filePath, async function(data, err) {
                if (err) {
                    console.log(err);
                    reject(err)
                }
                await fs2.appendFile(`${process.env.TMP_TXT_PATH}/${userId}/${fileName}.txt`, data)
                const textFilePath = path.resolve(`${process.env.TMP_TXT_PATH}/${userId}/${fileName}.txt`)
                resolve(textFilePath)
            })
        })
    }

    deleteTempTextFile(userId) {
        const textFolderPath = `${process.env.TMP_TXT_PATH}/${userId}`
        fs.readdir(textFolderPath, async (err, files) => {
            if (err) reject(err);
            for (const file of files) {
                await fs2.unlink(path.join(textFolderPath, file))
            }
        })
    }

    createAndStoreEmbeddingsOnIndex(documents, namespace) {
        return new Promise(async (resolve, reject) => {
            // const client = await init_pinecone_index()
            const client = new PineconeClient();

            await client.init({
                apiKey: process.env.PINECONE_API_KEY,
                environment: process.env.PINECONE_ENVIRONMENT,
            });

            const pineconeIndex = client.Index(process.env.PINECONE_INDEX);

            PineconeStore.fromDocuments(documents, embeddings, {
                pineconeIndex,
                namespace
            })
            .then((res) => resolve(res))
            .catch((err) => reject(err))
        })
    }

    removeTempCSVFile(fileName) {
        const filePath = `${process.env.TMP_CSV_PATH}`
        if(fs.existsSync(path.join(filePath, `${fileName}.csv`))) {
            fs.unlinkSync(path.join(filePath, `${fileName}.csv`))
        }
    }

    getPastMessages(chatId) {
        return new Promise((resolve, reject) => {
            const chat = new Chat(this.dbConnection)
            chat.getChatMessages(chatId)
            .then((messages) => {
                let pastMessages = []
                for (const message of messages) {
                    if(message.role == 'user') {
                        pastMessages.push(new HumanMessage(message.message))
                    } else if(message.role == 'bot') {
                        pastMessages.push(new AIMessage(message.message))
                    }
                }
                resolve(pastMessages)
            })
            .catch((err) => {
                reject(err)
            })
        })
    }

    combineStrings(strList) {
        let combinedString = ""
        strList.map((str, index) => {
            if(str) {
                if(index != strList.length - 1) {
                    combinedString += str + "$$"
                } else {
                    combinedString += str
                }
            }
        })
        return combinedString
    }

    removeEmptyString(str) {
        const cleanedData = str.map((s) => {
            if(s != "") return s 
        })
        return cleanedData
    }

    addDelimiterForAIResponse(response) {
        if(response) {
            const textArr = response.split('\n')
            const cleanedData = this.removeEmptyString(textArr)
            const combinedString = this.combineStrings(cleanedData)

            return combinedString
        }
        return null
    }

    queryIndex(communityAlias, parentId, chatId, question) {
        return new Promise(async (resolve, reject) => {
            const chat = new Chat(this.dbConnection)
            try {
                const model = new ChatOpenAI({});
                const vectorStore = await initVectoreStore(communityAlias)

                // let pastMessages = await this.getPastMessages(chatId)

                const QA_PROMPT = `Given the following conversation and a follow up question, return the conversation history excerpt that includes any relevant context to the question if it exists and rephrase the follow up question to be a standalone question.
                Chat History:
                {chat_history}
                Follow Up Input: {question}
                Your answer should follow the following format:
                \`\`\`
                Use the following pieces of context to answer the users question.
                If you don't know the answer or if you don't find the answers in vector database, just say that you don't know, don't try to make up an answer from your own knlowdge base.
                ----------------
                <Relevant chat history excerpt as context here>
                Standalone question: <Rephrased question here>
                \`\`\`
                Your answer:`

                const chain = ConversationalRetrievalQAChain.fromLLM(
                    model,
                    vectorStore.asRetriever(),
                    {
                        returnSourceDocuments: true,
                        // questionGeneratorChainOptions: {
                        //     template: QA_PROMPT
                        // }
                    }
                );

                const res = await chain.call({ question, chat_history: [] });
                const delimitedText = this.addDelimiterForAIResponse(res.text)

                if(delimitedText) {
                    chat.addMessagesToTheChatHistory(chatId, delimitedText, 'bot', parentId)
                    .then((messageId) => {
                        resolve(messageId)
                    })
                    .catch((err) => {
                        console.log(err)
                        reject(err)
                    })
                } else {
                    chat.addMessagesToTheChatHistory(chatId, process.env.OPENAI_FAILURE_ANSWER, 'bot', parentId)
                    .then((messageId) => {
                        resolve(messageId)
                    })
                    .catch((err) => {
                        console.log(err)
                        reject(err)
                    })
                }
                
            } catch (error) {
                console.log(error)
                chat.addMessagesToTheChatHistory(chatId, process.env.OPENAI_FAILURE_ANSWER, 'bot', parentId)
                .then((messageId) => {
                    resolve(messageId)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
            }
        })
    }
}

module.exports = Documents