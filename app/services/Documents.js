var fs = require('fs');
var fs2 = require('fs').promises;
const path = require('path');
const { PDFLoader } = require("langchain/document_loaders/fs/pdf");
const { TokenTextSplitter } = require("langchain/text_splitter");
const { DocxLoader } = require("langchain/document_loaders/fs/docx");
const { TextLoader } = require("langchain/document_loaders/fs/text");
const { CSVLoader } = require("langchain/document_loaders/fs/csv");
const { PineconeStore } = require("langchain/vectorstores/pinecone");
const { Pinecone } = require("@pinecone-database/pinecone");
const { HumanMessage, AIMessage } = require("langchain/schema");
const { ChatOpenAI } = require("langchain/chat_models/openai");
const {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate,
  } = require("langchain/prompts");
const { RunnableSequence } = require("langchain/schema/runnable");
const { StringOutputParser } = require("langchain/schema/output_parser");
const { formatDocumentsAsString } = require("langchain/util/document");
const XLSX = require("xlsx");
var reader = require('any-text');
const { convert } = require('html-to-text');
const officeParser = require('officeparser');
const Community = require('./Community');
const Chat = require("./Chat")
const { embeddings } = require('../init/OpenAIEmbeddings')
const { initVectoreStore } = require('../init/VectorStore')
const SuperAdmin = require('./SuperAdmin')
const CustomQuerying = require('./CustomQuerying')
const winston = require('winston');
const { combine, timestamp, json } = winston.format;
const dotenv = require('dotenv');
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

    // getPredecessorFolders(folderId) {
    //     return new Promise(async(resolve, reject) => {
    //         try {
    //             let nextParentId = folderId;
    //             let folderTrace = [];
    //             while(true) {
    //                 if(!nextParentId) {
    //                     resolve(folderTrace.reverse())
    //                     break
    //                 }
    //                 const _data = await this.dbConnection('documents').select('*').where({ id: nextParentId })
    //                 folderTrace.push(_data[0])
    //                 nextParentId = _data[0]["parentId"]
    //             }
    //         } catch (error) {
    //             console.log(error)
    //             reject(error)
    //         }
    //     })
    // }

    getPredecessorFolders(folderId) {
        return new Promise(async(resolve, reject) => {
            try {
                let nextParentId = folderId;
                let folderTrace = [];
                    
                while (nextParentId) {
                    const _data = await this.dbConnection('documents')
                                .select('*')
                                .where({ id: nextParentId });
                
                    if (_data.length === 0) {
                        break;
                    }
                
                    folderTrace.push(_data[0]);
                    nextParentId = _data[0]["parentId"];
                }
            
                resolve(folderTrace.reverse());
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

    updateFile(
        fileName,
        fileId
    ) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection('documents')
            .update({
                name: fileName,
                created: dateTime
            })
            .where({ id: fileId })
            .then((res) => {
                resolve(res)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    isFileNameSame(newFileName, fileId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
            .select('name')
            .where({ id: fileId })
            .then((res) => {
                if(res[0].name == newFileName) {
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

    checkIfFileNameExistUnderParentId(fileName, parentId, communityId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
            .select('*')
            .where({ parentId })
            .andWhere({ name: fileName })
            .andWhere({ communityId })
            .then((res) => {
                if(res.length > 0) {
                    resolve(1)
                } else {
                    resolve(0)
                }
            })
            .catch((err) => {
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

    deleteEmbeddingsByMetadata(fileId, namespace) {
        return new Promise(async (resolve, reject) => {
            const client = new Pinecone();

            client.index(process.env.PINECONE_INDEX).namespace(namespace).deleteMany({ fileId: fileId })
            .then((res) => {
                console.log(res)
                resolve(1)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
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
                            await this.deleteEmbeddingsByMetadata(file.id, alias)
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
                        await this.deleteEmbeddingsByMetadata(file.id, alias)
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

    async createDocumentFromPDF(file, metaData, fileName) {
        const loader = new PDFLoader(file);

        const splitter = new TokenTextSplitter({
            encodingName: "gpt2",
            chunkSize: 1000,
            chunkOverlap: 50,
        });

        const docs = await loader.loadAndSplit(splitter);

        docs.forEach(element => {
            element.metadata['fileId'] = metaData
            let _pageContent = `The content given below belongs to ${fileName} file\n`
            element.pageContent = _pageContent + element.pageContent
        });

        logger.info(JSON.stringify(docs))

        return docs;
    }

    async createDocumentFromDocx(file, metaData, fileName) {
        const loader = new DocxLoader(file);
          
        const splitter = new TokenTextSplitter({
            encodingName: "gpt2",
            chunkSize: 1000,
            chunkOverlap: 50,
        });

        const docs = await loader.loadAndSplit(splitter);

        docs.forEach(element => {
            element.metadata['fileId'] = metaData
            let _pageContent = `The content given below belongs to ${fileName} file\n`
            element.pageContent = _pageContent + element.pageContent
        });

        logger.info(JSON.stringify(docs))

        return docs;
    }

    async createDocumentFromText(file, metaData, fileName) {
        const loader = new TextLoader(file);
          
        const splitter = new TokenTextSplitter({
            encodingName: "gpt2",
            chunkSize: 1000,
            chunkOverlap: 50,
        });

        const docs = await loader.loadAndSplit(splitter);

        docs.forEach(element => {
            element.metadata['fileId'] = metaData
            let _pageContent = `The content given below belongs to ${fileName} file\n`
            element.pageContent = _pageContent + element.pageContent
        });

        logger.info(JSON.stringify(docs))

        return docs;
    }

    async createDocumentFromCSV(file, metaData, fileName) {
        const loader = new CSVLoader(file);
          
        const splitter = new TokenTextSplitter({
            encodingName: "gpt2",
            chunkSize: 1000,
            chunkOverlap: 50,
        });

        const docs = await loader.loadAndSplit(splitter);

        docs.forEach(element => {
            element.metadata['fileId'] = metaData
            let _pageContent = `The content given below belongs to ${fileName} file\n`
            element.pageContent = _pageContent + element.pageContent
        });

        logger.info(JSON.stringify(docs))

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
                const folderPath = `${process.env.TMP_TXT_PATH}/` + userId
                if(!fs.existsSync(path.resolve(folderPath))){
                    await fs2.mkdir(folderPath)
                }
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
                const folderPath = `${process.env.TMP_TXT_PATH}/` + userId
                if(!fs.existsSync(path.resolve(folderPath))){
                    await fs2.mkdir(folderPath)
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

    saveHtmlStringToFile(communityAlias, fileName, htmlString) {
        return new Promise(async (resolve, reject) => {
            try {
                const htmlFilePath = path.join(path.resolve(process.env.DOCUMENT_PATH), communityAlias)
                await fs2.writeFile(path.join(htmlFilePath, `${fileName}.html`), htmlString)
                resolve(1)
            } catch (error) {
                reject(error)
            }
        })
    }

    extractTextFromHtmlStringAndCreateTextFile(htmlString, userId, fileName) {
        return new Promise(async (resolve, reject) => {
            try {
                const tmpTextFileBasePath = path.join(path.resolve(process.env.TMP_TXT_PATH), `${userId}`)
                const options = {
                    wordwrap: false
                };
                const text = convert(htmlString, options);
                const folderPath = `${process.env.TMP_TXT_PATH}/` + userId
                if(!fs.existsSync(path.resolve(folderPath))){
                    await fs2.mkdir(folderPath)
                }
                await fs2.writeFile(path.join(tmpTextFileBasePath, `${fileName}.txt`), text)
                resolve(path.join(tmpTextFileBasePath, `${fileName}.txt`))
            } catch (error) {
                reject(error)
            }
        })
    }

    createAndStoreEmbeddingsOnIndex(documents, namespace) {
        return new Promise(async (resolve, reject) => {
            const client = new Pinecone();

            const pineconeIndex = client.Index(process.env.PINECONE_INDEX);

            PineconeStore.fromDocuments(documents, embeddings, {
                pineconeIndex,
                namespace
            })
            .then((res) => {
                logger.info(JSON.stringify(res))
                resolve(res)
            })
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

    getFileName(fileId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
            .select('name')
            .where({ id: fileId })
            .then((res) => {
                if(res.length > 0) {
                    resolve(res[0])
                }
                resolve(null)
            })
            .catch((err) => {
                console.log(err)
            })
        })
    }

    getFilePath(fileId) {
        return new Promise((resolve, reject) => {
            this.checkIfFileExists(fileId)
            .then((res) => {
                if(res == 1) {
                    this.getPredecessorFolders(fileId)
                    .then((parentFolders) => {
                        let filePath = ""
                        parentFolders.map((fileOrFolderData, index) => {
                            if(index != 0) {
                                const pathEnd = index != parentFolders.length - 1 ? '/' : ''
                                filePath += fileOrFolderData.name + pathEnd
                            }
                        })
                        resolve(filePath)
                    })
                    .catch((err) => {
                        console.log(err)
                        reject(err)
                    })
                } else {
                    resolve(null)
                }
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    async extractMetadataFromDocuments(sourceData) {
        try {
            const fileList = []
            if(sourceData) {
                const citationExist = {}
                for (const document of sourceData) {
                    if(document.pageContent.length > 25) {
                        const fileId = document.metadata.fileId
                        const filePath = await this.getFilePath(fileId)
                        if(filePath && !citationExist[filePath]) {
                            fileList.push({ fileName: filePath })
                            citationExist[filePath] = true
                        } 
                    }
                }
            }
            return fileList
        } catch (error) {
            console.log(error)
            return []
        }
        
    }

    getNonResponseIdentifiers() {
        return new Promise((resolve, reject) => {
            this.dbConnection("non-response-identifiers")
            .select('*')
            .then((res) => {
                resolve(res)
            })
            .catch((err) => {
                reject(err)
            })
        })
    }

    buildRegExpFilterString() {
        return new Promise(async (resolve, reject) => {
            try {
                let filterString = ""
                const identifierList = await this.getNonResponseIdentifiers()
                identifierList.map((data, index) => {
                    const stringSuffix = index == identifierList.length - 1 ? '' : '|' 
                    filterString += data.identifier + stringSuffix
                })
                resolve(filterString)
            } catch (error) {
                reject(error)
            }
        })
    }

    async isOutOfContextAnswer (aiAnswer) {
        const filterString = await this.buildRegExpFilterString()
        const regExp = new RegExp(`(?<text>${filterString})`, 'i')
        const found = aiAnswer.match(regExp)
        if(found && found.length > 0) return true
        return false
    }

    queryIndex(communityAlias, parentId, chatId, question) {
        return new Promise(async (resolve, reject) => {
            const chat = new Chat(this.dbConnection)
            const superAdmin = new SuperAdmin(this.dbConnection)
            const customQuerying = new CustomQuerying(this.dbConnection)

            try {
                const setting = await superAdmin.getSettings('queryType')
                const queryType = setting[0]['meta_value']
                let res = null
                if(queryType == 'langchain') {
                    console.log("Langchain Query")
                    logger.info(`Querying using langchain query solution`)
                    const model = new ChatOpenAI({
                        modelName: process.env.CHAT_MODEL
                    });
                    const vectorStore = await initVectoreStore(communityAlias)
                    const retriever = vectorStore.asRetriever(10)
    
                    const SYSTEM_TEMPLATE = `Use the following pieces of context to answer the users question.
                    If you don't know the answer from the given context, just apologise and say that you don't know, don't try to make up an answer from outside the context.
                    ----------------
                    {context}`;
    
                    const messages = [
                        SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
                        HumanMessagePromptTemplate.fromTemplate("{question}"),
                    ];
                    const prompt = ChatPromptTemplate.fromMessages(messages);
    
                    const chain = RunnableSequence.from([
                        {
                            question: (input) =>
                                input.question,
                            chatHistory: (input) =>
                                input.chatHistory ?? "",
                            context: async (input) => {
                                const relevantDocs = await retriever.getRelevantDocuments(input.question);
                                const serialized = formatDocumentsAsString(relevantDocs);
                                return serialized;
                            },
                            
                        },
                        {
                            sourceDocuments: RunnableSequence.from([
                                (input) => input.question,
                                retriever,
                            ]),
                            question: (input) => input.question,
                        },
                        {
                            sourceDocuments: (previousStepResult) => previousStepResult.sourceDocuments,
                            question: (previousStepResult) => previousStepResult.question,
                            context: (previousStepResult) =>
                            formatDocumentsAsString(previousStepResult.sourceDocuments),
                        },
                        {
                            result: prompt.pipe(model).pipe(new StringOutputParser()),
                            sourceDocuments: (previousStepResult) => previousStepResult.sourceDocuments,
                        }
                    ]);
    
                    res = await chain.invoke({
                        question,
                    });
                } else {
                    console.log("Custom Query")
                    logger.info(`Querying using custom query solution`)
                    res = await customQuerying.queryIndexByCustomQuerying(question, communityAlias, chatId)
                }

                const delimitedText = this.addDelimiterForAIResponse(res.result)
                let fileList = []
                if(!await this.isOutOfContextAnswer(res.result)) {
                    fileList = await this.extractMetadataFromDocuments(res.sourceDocuments)
                }

                logger.info(JSON.stringify(res))

                if(delimitedText) {
                    chat.addMessagesToTheChatHistory(
                        chatId, 
                        delimitedText, 
                        'bot', 
                        parentId, 
                        fileList.length > 0 ? JSON.stringify(fileList) : null
                    )
                    .then((messageId) => {
                        resolve(messageId)
                    })
                    .catch((err) => {
                        console.log(err)
                        reject(err)
                    })
                } else {
                    chat.addMessagesToTheChatHistory(chatId, process.env.OPENAI_FAILURE_ANSWER, 'bot', parentId, null)
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
                chat.addMessagesToTheChatHistory(chatId, process.env.OPENAI_FAILURE_ANSWER, 'bot', parentId, null)
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