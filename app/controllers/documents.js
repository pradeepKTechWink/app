const dotenv = require('dotenv');
const path = require('path')
var fs = require('fs');
const Documents = require('../services/Documents')
const Community = require('../services/Community')
const Users = require('../services/Users')
dotenv.config();
const winston = require('winston');
const { combine, timestamp, json } = winston.format;
var fs2 = require('fs').promises;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), json()),
  transports: [
    new winston.transports.File({
      filename: process.env.LOG_FILE_PATH,
    }),
  ],
});

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

class DocumentController {
    static createNewFolder(request, response) {
      const documents = new Documents(knex)

      if(
        request.body.folderName &&
        request.body.parentId &&
        request.body.communityId
      ) {
        logger.info(`Creating new folder for community ${request.body.communityId}`)
        documents.createFolder(
          request.body.folderName, 
          request.body.tooltip ? request.body.tooltip : "",
          false,
          request.body.parentId, 
          request.body.communityId
        )
        .then((res) => {
          logger.info(`Folder created successfully for community ${request.body.communityId}`)
          logger.info(`Fetching updated files and folders for community ${request.body.communityId}`)
          documents.getChildFoldersAndFiles(request.body.parentId, request.body.communityId)
          .then((res) => {
            logger.info(`Fetched updated files and folders for community ${request.body.communityId}`)
            logger.debug(JSON.stringify( { success: true, message: request.t('folderCreationSuccess'), filesAndFolders: res } ))
            return response.status(201)
            .send({ success: true, message: request.t('folderCreationSuccess'), filesAndFolders: res });
          })
          .catch((err) => {
            logger.warn(`Failed to fetch the updated files and folders for community ${request.body.communityId}`)
            logger.error(err)
            logger.debug(JSON.stringify( { success: true, message: request.t('folderCreationSuccessFetchFailed') } ))
            return response.status(201)
            .send({ success: true, message: request.t('folderCreationSuccessFetchFailed') });
          })
        })
        .catch((err) => {
          logger.warn(`Folder creation failed for community ${request.body.communityId}`)
          logger.error(err)
          logger.debug(JSON.stringify( { success: false, message: request.t('folderCreationFailed') } ))
          return response.status(201)
            .send({ success: false, message: request.t('folderCreationFailed') });
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static getRootFoldersForCommunity(request, response) {
      const documents = new Documents(knex)

      if(request.body.communityId) {
        logger.info(`Fetching root folders for community ID ${request.body.communityId}`)
        documents.getRootFolders(request.body.communityId)
        .then((_list) => {
          logger.info(`Root folders fetched successfully for community ID ${request.body.communityId}`)
          logger.debug(JSON.stringify( { success: true, filesAndFolders: _list  } ))
          return response.status(201)
              .send({ success: true, filesAndFolders: _list  });
        })
        .catch((err) => {
          logger.warn(`Failed to fetch root folders for community ${request.body.communityId}`)
          logger.error(err)
          logger.debug(JSON.stringify( { success: false } ))
          return response.status(201)
              .send({ success: false });
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static getChildFoldersAndFiles(request, response) {
      const documents = new Documents(knex)

      if(
        request.body.parentId &&
        request.body.communityId
      ) {
        logger.info(`Fetching child folders and files for the folders ID ${request.body.parentId}`)
        documents.getChildFoldersAndFiles(request.body.parentId, request.body.communityId)
        .then((res) => {
          documents.getPredecessorFolders(request.body.parentId)
          .then((predecessFolders) => {
            logger.info(`Files and folders fetched for folder Id ${request.body.parentId}`)
            logger.debug(JSON.stringify( { success: true, filesAndFolders: res, predecessFolders } ))
            return response.status(201)
              .send({ success: true, filesAndFolders: res, predecessFolders });
          })
          .catch((err) => {
            logger.info(`Failed to fetch files and folders for folder Id ${request.body.parentId}`)
            logger.error(err)
            logger.debug(JSON.stringify( { success: true, filesAndFolders: res, predecessFolders: [] } ))
            return response.status(201)
              .send({ success: true, filesAndFolders: res, predecessFolders: [] });
          })
        })
        .catch((err) => {
          logger.info(`Failed to fetch files and folders for folder Id ${request.body.parentId}`)
          logger.error(err)
          logger.debug(JSON.stringify( { success: false } ))
          return response.status(201)
              .send({ success: false });
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static getPreviousFilesAndFolders(request, response) {
      const documents = new Documents(knex)

      if(
        request.body.folderId &&
        request.body.communityId
      ) {
        logger.info(`Fetching child folders and files for the folders ID ${request.body.folderId}`)
        documents.getParentId(request.body.folderId)
        .then((parentId) => {
          documents.getParentId(parentId)
          .then((_parentId2) => {
            documents.getChildFoldersAndFiles(_parentId2, request.body.communityId)
            .then((res) => {
              logger.info(`Files and folders fetched for folder Id ${request.body.folderId}`)
              logger.debug(JSON.stringify( { success: true, filesAndFolders: res  } ))
              return response.status(201)
              .send({ success: true, filesAndFolders: res  });
            })
            .catch((err) => {
              logger.info(`Failed to fetch files and folders for folder Id ${request.body.folderId}`)
              logger.error(err)
              logger.debug(JSON.stringify( { success: false } ))
              return response.status(201)
              .send({ success: false });
            })
          })
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static deleteFolder(request, response) {
      const documents = new Documents(knex)

      if(
        request.body.folderId && 
        request.body.communityId && 
        request.body.parentId
      ) {
        request.body.searchString = request.body.searchString ? request.body.searchString : ""
        logger.info(`Deleting folder Id ${request.body.folderId}`)
        documents.deleteFolder(request.body.folderId, request.body.communityId)
        .then((res) => {
          if(res == 1) {
            logger.info(`Folder Id ${request.body.folderId} deleted`)
            logger.info(`Fetching updated files and folders`)
            if(request.body.searchString.length > 0) {
              documents.searchFilesAndFolders(request.body.searchString, request.body.communityId)
              .then((searchResult) => {
                logger.info(`Updated files and folders fetched successfully`)
                logger.debug(JSON.stringify( { success: true, message: request.t('folderDeletionSuccess'), filesAndFolders: searchResult, predecessFolders: [] } ))
                return response.status(200)
                        .send({ success: true, message: request.t('folderDeletionSuccess'), filesAndFolders: searchResult, predecessFolders: [] });
              })
              .catch((err) => {
                logger.warn(`Failed to fetch the updated files and folders`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false,  message: request.t('folderDeletionFailed') } ))
                return response.status(201)
                        .send({ success: false,  message: request.t('folderDeletionFailed') });
              })
            } else {
              documents.getChildFoldersAndFiles(request.body.parentId, request.body.communityId)
              .then((res) => {
                logger.info(`Updated files and folders fetched successfully`)
                logger.debug(JSON.stringify( { success: true, message: request.t('folderDeletionSuccess'), filesAndFolders: res  } ))
                return response.status(201)
                    .send({ success: true, message: request.t('folderDeletionSuccess'), filesAndFolders: res  });
              })
              .catch((err) => {
                logger.warn(`Failed to fetch the updated files and folders`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false, message: request.t('folderDeletionFailed') } ))
                return response.status(201)
                    .send({ success: false, message: request.t('folderDeletionFailed') });
              })
            }
          } else {
            logger.warn(`Failed to delete the folder Id ${request.body.folderId}`)
            logger.debug(JSON.stringify( { success: false, message: request.t('folderDeletionFailed') } ))
            return response.status(201)
                  .send({ success: false, message: request.t('folderDeletionFailed') });
          }
        })
        .catch((err) => {
          logger.warn(`Failed to delete the folder Id ${request.body.folderId}`)
          logger.error(err)
          logger.debug(JSON.stringify( { success: false, message: request.t('folderDeletionFailed') } ))
          return response.status(201)
                  .send({ success: false, message: request.t('folderDeletionFailed') });
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static deleteFile(request, response) {
      const documents = new Documents(knex)
      
      if(
        request.body.fileId &&
        request.body.communityId &&
        request.body.parentId
      ) {
        request.body.searchString = request.body.searchString ? request.body.searchString : ""
        logger.info(`Deleting file Id ${request.body.fileId}`)
        documents.deleteFile(request.body.fileId, request.body.communityId)
        .then((res) => {
          if(res == 1) {
            logger.info(`File Id ${request.body.fileId} deleted`)
            if(request.body.searchString.length > 0) {
              logger.info(`Fetching updated files and folders`)
              documents.searchFilesAndFolders(request.body.searchString, request.body.communityId)
              .then((searchResult) => {
                logger.info(`Updated files and folders fetched successfully`)
                logger.debug(JSON.stringify( { success: true, message: request.t('fileDeletionSuccess'), filesAndFolders: searchResult, predecessFolders: [] } ))
                return response.status(200)
                        .send({ success: true, message: request.t('fileDeletionSuccess'), filesAndFolders: searchResult, predecessFolders: [] });
              })
              .catch((err) => {
                logger.warn(`Failed to fetch the updated files and folders`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false,  message: request.t('fileDeletionFailed') } ))
                return response.status(201)
                        .send({ success: false,  message: request.t('fileDeletionFailed') });
              })
            } else {
              documents.getChildFoldersAndFiles(request.body.parentId, request.body.communityId)
              .then((res) => {
                logger.info(`Updated files and folders fetched successfully`)
                logger.debug(JSON.stringify( { success: true, message: request.t('fileDeletionSuccess'), filesAndFolders: res  } ))
                return response.status(201)
                    .send({ success: true, message: request.t('fileDeletionSuccess'), filesAndFolders: res  });
              })
              .catch((err) => {
                logger.warn(`Failed to fetch the updated files and folders`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false, message: request.t('fileDeletionFailed') } ))
                return response.status(201)
                    .send({ success: false, message: request.t('fileDeletionFailed') });
              })
            }
          } else {
            logger.warn(`Failed to delete the file Id ${request.body.fileId}`)
            logger.debug(JSON.stringify( { success: false, message: request.t('fileDeletionFailed') } ))
            return response.status(201)
                  .send({ success: false, message: request.t('fileDeletionFailed') });
          }
        })
        .catch((err) => {
          logger.warn(`Failed to delete the file Id ${request.body.fileId}`)
          logger.error(err)
          logger.debug(JSON.stringify( { success: false, message: request.t('fileDeletionFailed') } ))
          return response.status(201)
                  .send({ success: false, message: request.t('fileDeletionFailed') });
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static getFolderData(request, response) {
      const documents = new Documents(knex)

      if(request.body.folderId) {
        logger.info(`Fetching folder data for Id ${request.body.folderId}`)
        documents.getFolderData(request.body.folderId)
        .then((folderData) => {
          logger.info(`Folder data fetched successfully for ${request.body.folderId}`)
          logger.debug(JSON.stringify( { success: true, folderData } ))
          return response.status(201)
            .send({ success: true, folderData });
        })
        .catch((err) => {
          logger.warn(`Failed to fetch folder data for Id ${request.body.folderId}`)
          logger.error(err)
          logger.debug(JSON.stringify( { success: false } ))
          return response.status(201)
                  .send({ success: false });
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static updateFolderData(request, response) {
      const documents = new Documents(knex)

      if(
        request.body.folderId &&
        request.body.folderName &&
        request.body.communityId &&
        request.body.parentId
      ) {
        logger.info(`Updating folder data for Id ${request.body.folderId}`)
        request.body.searchString = request.body.searchString ? request.body.searchString : ""
        documents.updateFolder(
          request.body.folderId, 
          request.body.folderName, 
          request.body.folderDescription ? request.body.folderDescription : ""
        )
        .then((res) => {
          if(res == 1) {
            logger.info(`Folder Id ${request.body.folderId} updated successfully`)
            if(request.body.searchString.length > 0) {
              logger.info(`Fetching updated folder lists`)
              documents.searchFilesAndFolders(request.body.searchString, request.body.communityId)
              .then((searchResult) => {
                logger.info(`Updated folder lists fetched successfully`)
                logger.debug(JSON.stringify( { success: true, message: request.t('folderUpdateSuccess'), filesAndFolders: searchResult, predecessFolders: [] } ))
                return response.status(200)
                        .send({ success: true, message: request.t('folderUpdateSuccess'), filesAndFolders: searchResult, predecessFolders: [] });
              })
              .catch((err) => {
                console.log(err)
                logger.warn(`Failed to fetch updated folder list`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false,  message: request.t('folderUpdateSuccessFetchFailed') } ))
                return response.status(201)
                        .send({ success: false,  message: request.t('folderUpdateSuccessFetchFailed') });
              })
            } else {
              logger.info(`Fetching updated folder lists`)
              documents.getChildFoldersAndFiles(request.body.parentId, request.body.communityId)
              .then((res) => {
                logger.info(`Updated folder lists fetched successfully`)
                logger.debug(JSON.stringify( { success: true, message: request.t('folderUpdateSuccess'), filesAndFolders: res  } ))
                return response.status(201)
                    .send({ success: true, message: request.t('folderUpdateSuccess'), filesAndFolders: res  });
              })
              .catch((err) => {
                logger.warn(`Failed to fetch updated folder list`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false, message: request.t('folderUpdateSuccessFetchFailed') } ))
                return response.status(201)
                    .send({ success: false, message: request.t('folderUpdateSuccessFetchFailed') });
              })
            }
          } else {
            logger.warn(`Folder update failed for Id ${request.body.folderId}`)
            logger.debug(JSON.stringify( { success: false, message: request.t('folderUpdateFailed') } ))
            return response.status(201)
                  .send({ success: false, message: request.t('folderUpdateFailed') });
          }
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static getFile(request, response) {
      const documents = new Documents(knex)

      if(
        request.body.fileId &&
        request.body.communityId &&
        request.body.fileType
      ) {
        logger.info(`Fetching buffer for file Id ${request.body.fileId}`)
        const mimeTypeMap = {
          'docx' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'doc' : 'application/msword',
          'xlsx' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'xls' : 'application/vnd.ms-excel',
          'pdf' : 'application/pdf',
          'txt' : 'text/plain;charset=utf-8',
          'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'html': 'text/html'
        }

        documents.getDocumentPath(request.body.fileId, request.body.communityId)
        .then((res) => {
          if(res == 'file-not-found') {
            logger.warn(`File ${request.body.fileId} does not exist`)
            logger.debug(JSON.stringify( { success: false, message: request.t('fileNotFound') } ))
            return response.status(201)
                  .send({ success: false, message: request.t('fileNotFound') });
          } else {
            logger.info(`File ${request.body.fileId} exists`)
            const src = fs.createReadStream(res);

            response.writeHead(200, {
              'Content-Type': mimeTypeMap[request.body.fileType],
              'Content-Disposition': `attachment; filename=file.${request.body.fileType}`,
              'Content-Transfer-Encoding': 'Binary'
            });

            src.pipe(response);
          }
        })
        .catch((err) => {
          logger.warn(`Failed to fetch buffer file Id ${request.body.fileId}`)
          logger.error(err)
          logger.debug(JSON.stringify( { success: false, message: request.t('documentFetchFailed') } ))
          return response.status(201)
                  .send({ success: false, message: request.t('documentFetchFailed') });
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static getFolderTreeForFile(request, response) {
      const documents = new Documents(knex)

      if(request.body.parentId) {
        logger.info(`Fetching folder tree for ${request.body.parentId}`)
        documents.getPredecessorFolders(request.body.parentId)
        .then((predecessFolders) => {
          logger.info(`Folder tree fetched for folder Id ${request.body.parentId}`)
          logger.debug(JSON.stringify( { success: true, predecessFolders } ))
          return response.status(201)
            .send({ success: true, predecessFolders });
        })
        .catch((err) => {
          logger.error(err)
          logger.warn(`Failed to fetch folder tree for folder Id ${request.body.parentId}`)
          return response.status(201)
            .send({ success: false, predecessFolders: [] });
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static searchFilesAndFolder(request, response) {
      const documents = new Documents(knex)

      if(request.body.communityId) {
        request.body.searchString = request.body.searchString ? request.body.searchString : ""
        logger.info(`Searching files and folders for search string ${request.body.searchString} on community Id ${request.body.communityId}`)
        documents.searchFilesAndFolders(request.body.searchString, request.body.communityId)
        .then((searchResult) => {
          logger.info(`Matching data fetched successfully for serahc string ${request.body.searchString}`)
          logger.debug(JSON.stringify( { success: true, filesAndFolders: searchResult, predecessFolders: [] } ))
          return response.status(200)
                  .send({ success: true, filesAndFolders: searchResult, predecessFolders: [] });
        })
        .catch((err) => {
          logger.warn(`Failed to fetch matching data for search string ${request.body.searchString}`)
          logger.error(err)
          logger.debug(JSON.stringify( { success: false } ))
          return response.status(201)
                  .send({ success: false });
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static getCompanyUsageData(request, response) {
      const documents = new Documents(knex) 
      const users = new Users(knex)

      if(request.body.companyId) {
        logger.info(`Fetching company storage data for Id ${request.body.companyId}`)
        documents.getStorageOccupationDetail(request.body.companyId)
        .then((storageOccupationData) => {
          logger.info(`Storage data fetched for Id ${request.body.companyId}`)
          logger.info(`Fetching user count data for Id ${request.body.companyId}`)
          users.getCompanyUserCount(request.body.companyId)
          .then((userCount) => {
            logger.info(`User count data fetched for Id ${request.body.companyId}`)
            logger.debug(JSON.stringify( { success: true, noOfQueries: 50, fileStorageSize: storageOccupationData, noOfUsers: userCount } ))
            return response.status(200)
                  .send({ success: true, noOfQueries: 50, fileStorageSize: storageOccupationData, noOfUsers: userCount });
          })
          .catch((err) => {
            logger.warn(`Failed to fetch user count data for Id ${request.body.companyId}`)
            logger.error(err)
            logger.debug(JSON.stringify( { success: false } ))
            return response.status(201)
                  .send({ success: false });
          })
        })
        .catch((err) => {
          console.log(err)
          logger.warn(`Failed to fetch storage data for Id ${request.body.companyId}`)
          logger.error(err)
          logger.debug(JSON.stringify( { success: false } ))
          return response.status(201)
                .send({ success: false });
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static createTextDocument(request, response) {
      const documents = new Documents(knex)
      const community = new Community(knex)

      if(
        request.body.fileName &&
        request.body.parentId &&
        request.body.communityId &&
        request.body.htmlString &&
        request.body.userId
      ) {
        logger.info(`Creating new document with a file name ${request.body.fileName}`)
        response.writeHead(200, {
          'Content-Type': 'text/plain; charset=us-ascii',
          'X-Content-Type-Options': 'nosniff'
        });

        logger.info(`Checking if file name already exist under the parent folder`)
        documents.checkIfFileNameExistUnderParentId(
          `${request.body.fileName}.html`,
          request.body.parentId,
          request.body.communityId
        )
        .then((res) => {
          if(res == 1) {
            logger.info(`Filename ${request.body.fileName} already exists`)
            response.write(`0&%&File ${request.body.fileName}.html already exists under current folder$`)
            response.end()
          } else {
            logger.info(`Filename ${request.body.fileName} does not exists`)
            logger.info(`Fetching community alias for ${request.body.communityId}`)
            community.getCommunityUUID(request.body.communityId)
            .then((uuid) => {
              logger.info(`Adding file data to database for ${request.body.communityId}`)
              documents.createFile(`${request.body.fileName}.html`, request.body.parentId, request.body.communityId)
              .then((fileId) => {
                logger.info(`File data added to database successfully`)
                logger.info(`Saving content to HTML file`)
                const htmlFilePath = path.join(path.resolve(`${process.env.DOCUMENT_PATH}/${uuid}`), `${fileId}.html`)
                documents.saveHtmlStringToFile(uuid, fileId, request.body.htmlString)
                .then((res) => {
                  if(res == 1) {
                    logger.info(`Content successfully saved to the HTML file ${request.body.fileName}.html`)
                    logger.info(`Extracting content from HTML file ${request.body.fileName}`)
                    documents.extractTextFromHtmlStringAndCreateTextFile(request.body.htmlString, request.body.userId, fileId[0])
                    .then((tmpTextFilePath) => {
                      documents.checkIfFileExists(fileId[0])
                      .then((res) => {
                        if(res == 1) {
                          if(fs.existsSync(htmlFilePath)){
                            logger.info(`Content extracted successfully from ${request.body.fileName}`)
                            logger.info(`Splitting contents from ${request.body.fileName}.html`)
                            response.write('1&%&File uploaded successfully, Analysing the document...$')
                            documents.createDocumentFromText(tmpTextFilePath, fileId[0], `${request.body.fileName}.html`)
                            .then((docs) => {
                              logger.info(`Content split successful from ${request.body.fileName}.html`)
                              logger.info(`Creating and storing embeddings for ${request.body.fileName}.html`)
                              documents.createAndStoreEmbeddingsOnIndex(docs, uuid)
                              .then(async (res) => {
                                logger.info(`Embeddings stored successfully on vector database for ${request.body.fileName}.html`)
                                await fs2.unlink(tmpTextFilePath);
                                response.write('1&%&File created successfully, File analyzed successfully$')
                                response.end()
                              })
                              .catch((err) => {
                                console.log(err)
                                logger.warn(`Failed to store embeddings on vector database.`)
                                logger.error(err)
                                response.write('0&%&File created successfully, Failed to analyze the file$')
                                response.end()
                              })
                            })
                            .catch((err) => {
                              console.log(err)
                              logger.warn(`Failed to split document for ${request.body.fileName}.html`)
                              logger.error(err)
                              response.write('0&%&File created successfully, Failed to analyze the file$')
                              response.end()
                            })
                          } else {
                            logger.warn(`${request.body.fileName}.html does not exist`)
                            response.write('0&%&File upload failed, Failed to analyze the file$')
                            response.end()
                          }
                        } else {
                          logger.warn(`${request.body.fileName}.html does not exist`)
                          response.write('0&%&File upload failed, Failed to analyze the file$')
                          response.end()
                        }
                      })
                      .catch((err) => {
                        console.log(err)
                        logger.warn(`${request.body.fileName}.html does not exist`)
                        logger.error(err)
                        response.write('0&%&File upload failed, Failed to analyze the file$')
                        response.end()
                      })
                    })
                    .catch((err) => {
                      console.log(err)
                      logger.warn(`Text extraction failed for ${request.body.fileName}.html`)
                      logger.error(err)
                      response.write('0&%&File upload failed, Failed to analyze the file$')
                      response.end()
                    })
                  }
                })
                .catch((err) => {
                  console.log(err)
                  logger.warn(`Failed to create ${request.body.fileName}.html file`)
                  logger.error(err)
                  response.write('0&%&File upload failed, Failed to analyze the file$')
                  response.end()
                })
              })
              .catch((err) => {
                console.log(err)
                logger.warn(`Failed to create ${request.body.fileName}.html file`)
                logger.error(err)
                response.write('0&%&File upload failed, Failed to analyze the file$')
                response.end()
              })
            })
            .catch((err) => {
              console.log(err)
              logger.warn(`Failed to create ${request.body.fileName}.html file`)
              logger.error(err)
              response.write('0&%&File upload failed, Failed to analyze the file$')
              response.end()
            })
          }
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    } 

    static updateDocument(request, response) {
      const documents = new Documents(knex)
      const community = new Community(knex)

      if(
        request.body.fileName &&
        request.body.fileId &&
        request.body.communityId &&
        request.body.htmlString &&
        request.body.userId
      ) {
        logger.info(`Updating ${request.body.fileName}.html file`)
        response.writeHead(200, {
          'Content-Type': 'text/plain; charset=us-ascii',
          'X-Content-Type-Options': 'nosniff'
        });

        logger.info(`Checking if new name is same as old name`)
        documents.isFileNameSame(`${request.body.fileName}.html`, request.body.fileId)
        .then((isSame) => {
          if(isSame == 1) {
            logger.info(`New name is same as old name`)
            logger.info(`Checking if ${request.body.fileName}.html exist`)
            documents.checkIfFileExists(request.body.fileId)
            .then((res) => {
              if(res == 1) {
                community.getCommunityUUID(request.body.communityId)
                .then(async (uuid) => {
                  const htmlFilePath = path.join(path.resolve(`${process.env.DOCUMENT_PATH}/${uuid}`), `${request.body.fileId}.html`)
                  if(fs.existsSync(htmlFilePath)){
                    logger.info(`${request.body.fileName}.html exists`)
                    logger.info(`Deleting old ${request.body.fileName}.html file and its embeddings`)
                    await fs2.unlink(htmlFilePath);
                    await documents.deleteEmbeddingsByMetadata(request.body.fileId, uuid)
                    logger.info(`Old file and embeddings deleted successfully`)
                    documents.updateFile(`${request.body.fileName}.html`, request.body.fileId)
                    .then((isUpdated) => {
                      if(isUpdated == 1) {
                        documents.saveHtmlStringToFile(uuid, request.body.fileId, request.body.htmlString)
                        .then((res) => {
                          if(res == 1) {
                            if(fs.existsSync(htmlFilePath)){
                              logger.info(`File updated successfully on the server`)
                              logger.info(`Splitting new documents and creating embeddings for it.`)
                              response.write('1&%&File uploaded successfully, Analysing the document...$')
                              documents.extractTextFromHtmlStringAndCreateTextFile(request.body.htmlString, request.body.userId, request.body.fileId)
                              .then((tmpTextFilePath) => {
                                documents.createDocumentFromText(tmpTextFilePath, request.body.fileId, `${request.body.fileName}.html`)
                                .then((docs) => {
                                  if(docs.length > 0) {
                                    logger.info(`Document split successful, creating embeddings`)
                                    documents.createAndStoreEmbeddingsOnIndex(docs, uuid)
                                    .then(async (res) => {
                                      logger.info(`Embeddings created successfully for ${request.body.fileName}.html`)
                                      await fs2.unlink(tmpTextFilePath)
                                      response.write('1&%&File updated successfully, File analyzed successfully$')
                                      response.end()
                                    })
                                    .catch((err) => {
                                      console.log(err)
                                      logger.warn(`Failed to create embeddings for ${request.body.fileName}.html`)
                                      logger.error(err)
                                      response.write('0&%&File update success, Failed to analyze the file$')
                                      response.end()
                                    })
                                  } else {
                                    logger.warn(`Failed to create embeddings for ${request.body.fileName}.html`)
                                    response.write('0&%&File update success, Failed to analyze the file$')
                                    response.end()
                                  }
                                })
                                .catch((err) => {
                                  console.log(err)
                                  logger.warn(`Document split failed for ${request.body.fileName}.html`)
                                  logger.error(err)
                                  response.write('0&%&File update success, Failed to analyze the file$')
                                  response.end()
                                })
                              })
                            } else {
                              logger.warn(`Failed to update ${request.body.fileName}.html`)
                              response.write('0&%&File update failed, Failed to analyze the file$')
                              response.end()
                            }
                          } else {
                            logger.warn(`Failed to update ${request.body.fileName}.html`)
                            response.write('0&%&File update failed, Failed to analyze the file$')
                            response.end()
                          }
                        })
                        .catch((err) => {
                          console.log(err)
                          logger.warn(`Failed to update ${request.body.fileName}.html`)
                          logger.error(err)
                          response.write('0&%&File update failed, Failed to analyze the file$')
                          response.end()
                        })
                      } else {
                        logger.warn(`Failed to update ${request.body.fileName}.html`)
                        response.write('0&%&File update failed, Failed to analyze the file$')
                        response.end()
                      }
                    })
                    .catch((err) => {
                      console.log(err)
                      logger.warn(`Failed to update ${request.body.fileName}.html`)
                      logger.error(err)
                      response.write('0&%&File update failed, Failed to analyze the file$')
                      response.end()
                    })
                  } else {
                    logger.warn(`Unable to find ${request.body.fileName}.html on the server`)
                    response.write('0&%&File update failed, unable to find the source file$')
                    response.end()
                  }
                })
                .catch((err) => {
                  console.log(err)
                  logger.warn(`Failed to update ${request.body.fileName}.html`)
                  logger.error(err)
                  response.write('0&%&File update failed, Failed to analyze the file$')
                  response.end()
                })
              } else {
                // File does not exist
                logger.warn(`Unable to find ${request.body.fileName}.html on the server`)
                response.write('0&%&File update failed, file does not exist$')
                response.end()
              }
            })
            .catch((err) => {
              console.log(err)
              logger.warn(`Unable to find ${request.body.fileName}.html on the server`)
              logger.error(err)
              response.write('0&%&File update failed, Failed to analyze the file$')
              response.end()
            })
          } else {
            logger.info(`Checking if file name ${request.body.fileName}.html already exists under parent.`)
            documents.checkIfFileNameExistUnderParentId(
              `${request.body.fileName}.html`,
              request.body.parentId,
              request.body.communityId
            )
            .then((isExist) => {
              if(isExist == 1) {
                logger.info(`${request.body.fileName}.html already exists`)
                response.write(`0&%&File ${request.body.fileName}.html already exists under current folder$`)
                response.end()
              } else {
                logger.info(`Checking if ${request.body.fileName}.html exists on the server`)
                documents.checkIfFileExists(request.body.fileId)
                .then((res) => {
                  if(res == 1) {
                    community.getCommunityUUID(request.body.communityId)
                    .then(async (uuid) => {
                      const htmlFilePath = path.join(path.resolve(`${process.env.DOCUMENT_PATH}/${uuid}`), `${request.body.fileId}.html`)
                      if(fs.existsSync(htmlFilePath)){
                        logger.info(`${request.body.fileName}.html exists on the server`)
                        logger.info(`Deleting old ${request.body.fileName}.html file and its embeddings`)
                        await fs2.unlink(htmlFilePath);
                        await documents.deleteEmbeddingsByMetadata(request.body.fileId, uuid)
                        logger.info(`Old file and embeddings deleted successfully`)
                        documents.updateFile(`${request.body.fileName}.html`, request.body.fileId)
                        .then((isUpdated) => {
                          if(isUpdated == 1) {
                            documents.saveHtmlStringToFile(uuid, request.body.fileId, request.body.htmlString)
                            .then((res) => {
                              if(res == 1) {
                                if(fs.existsSync(htmlFilePath)){
                                  logger.info(`File updated successfully on the server`)
                                  logger.info(`Splitting new documents and creating embeddings for it.`)
                                  response.write('1&%&File uploaded successfully, Analysing the document...$')
                                  documents.extractTextFromHtmlStringAndCreateTextFile(request.body.htmlString, request.body.userId, request.body.fileId)
                                  .then((tmpTextFilePath) => {
                                    documents.createDocumentFromText(tmpTextFilePath, request.body.fileId, `${request.body.fileName}.html`)
                                    .then((docs) => {
                                      if(docs.length > 0) {
                                        logger.info(`Document split successful, creating embeddings`)
                                        documents.createAndStoreEmbeddingsOnIndex(docs, uuid)
                                        .then(async (res) => {
                                          logger.info(`Embeddings created successfully for ${request.body.fileName}.html`)
                                          await fs2.unlink(tmpTextFilePath);
                                          response.write('1&%&File updated successfully, File analyzed successfully$')
                                          response.end()
                                        })
                                        .catch((err) => {
                                          console.log(err)
                                          logger.warn(`Failed to create embeddings for ${request.body.fileName}.html`)
                                          logger.error(err)
                                          response.write('0&%&File update success, Failed to analyze the file$')
                                          response.end()
                                        })
                                      } else {
                                        logger.warn(`Failed to create embeddings for ${request.body.fileName}.html`)
                                        response.write('0&%&File update success, Failed to analyze the file$')
                                        response.end()
                                      }
                                    })
                                    .catch((err) => {
                                      console.log(err)
                                      logger.warn(`Document split failed for ${request.body.fileName}.html`)
                                      logger.error(err)
                                      response.write('0&%&File update success, Failed to analyze the file$')
                                      response.end()
                                    })
                                  })
                                } else {
                                  logger.warn(`Failed to update ${request.body.fileName}.html`)
                                  response.write('0&%&File update failed, Failed to analyze the file$')
                                  response.end()
                                }
                              } else {
                                logger.warn(`Failed to update ${request.body.fileName}.html`)
                                response.write('0&%&File update failed, Failed to analyze the file$')
                                response.end()
                              }
                            })
                            .catch((err) => {
                              console.log(err)
                              logger.warn(`Failed to update ${request.body.fileName}.html`)
                              logger.error(err)
                              response.write('0&%&File update failed, Failed to analyze the file$')
                              response.end()
                            })
                          } else {
                            logger.warn(`Failed to update ${request.body.fileName}.html`)
                            response.write('0&%&File update failed, Failed to analyze the file$')
                            response.end()
                          }
                        })
                        .catch((err) => {
                          console.log(err)
                          logger.warn(`Failed to update ${request.body.fileName}.html`)
                          logger.error(err)
                          response.write('0&%&File update failed, Failed to analyze the file$')
                          response.end()
                        })
                      } else {
                        // Not able to find file source on the server
                        logger.warn(`Unable to find ${request.body.fileName}.html on the server`)
                        response.write('0&%&File update failed, unable to find the source file$')
                        response.end()
                      }
                    })
                    .catch((err) => {
                      console.log(err)
                      logger.warn(`Unable to find ${request.body.fileName}.html on the server`)
                      logger.error(err)
                      response.write('0&%&File update failed, Failed to analyze the file$')
                      response.end()
                    })
                  } else {
                    // File does not exist
                    logger.warn(`Unable to find ${request.body.fileName}.html on the server`)
                    response.write('0&%&File update failed, file does not exist$')
                    response.end()
                  }
                })
                .catch((err) => {
                  console.log(err)
                  logger.warn(`Unable to find ${request.body.fileName}.html on the server`)
                  logger.error(err)
                  response.write('0&%&File update failed, Failed to analyze the file$')
                  response.end()
                })
              }
            })
          }
        }) 
        .catch((err) => {
          console.log(err)
          logger.warn(`Unable to find ${request.body.fileName}.html on the server`)
          logger.error(err)
          response.write('0&%&File update failed, Failed to analyze the file$')
          response.end()
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static changeFileName(request, response) {
      const documents = new Documents(knex)

      if(
        request.body.fileId &&
        request.body.fileName &&
        request.body.parentId &&
        request.body.communityId
      ) {
        logger.info(`Changing file name for ${request.body.fileId}`)
        logger.info(`Checking if the new name is same as the old name`)
        documents.isFileNameSame(`${request.body.fileName}.html`, request.body.fileId)
        .then((isSameName) => {
          if(isSameName == 1) {
            logger.warn(`New name ${request.body.fileName}.html is same as the old name.`)
            logger.debug(JSON.stringify( { success: false, message: "Old filename is same as new filename" } ))
            return response.status(200)
              .send({ success: false, message: "Old filename is same as new filename" });
          } else {
            logger.info(`Checking if ${request.body.fileName}.html already exist under parent`)
            documents.checkIfFileNameExistUnderParentId(
              `${request.body.fileName}.html`,
              request.body.parentId,
              request.body.communityId
            )
            .then((res) => {
              if(res == 1) {
                logger.warn(`${request.body.fileName}.html already exists under the parent`)
                logger.debug(JSON.stringify( { success: false, message: `${request.body.fileName}.html already exist under current folder` } ))
                return response.status(200)
                  .send({ success: false, message: `${request.body.fileName}.html already exist under current folder` });
              } else {
                logger.info(`${request.body.fileName}.html does not exist under parent folder`)
                logger.info(`Update database information for fileId ${request.body.fileId}`)
                documents.updateFile(`${request.body.fileName}.html`, request.body.fileId)
                .then((res) => {
                  console.log('Response', res)
                  if(res == 1) {
                    logger.info(`Filename updated successfully`)
                    logger.debug(JSON.stringify( { success: true, message: "Filename updated successfully" } ))
                    return response.status(200)
                      .send({ success: true, message: "Filename updated successfully" });
                  } else {
                    logger.warn(`Failed to update the filename`)
                    logger.debug(JSON.stringify( { success: false, message: "Failed to update the filename" } ))
                    return response.status(200)
                      .send({ success: false, message: "Failed to update the filename" });
                  }
                })
                .catch((err) => {
                  console.log(err)
                  logger.warn(`Failed to update the filename`)
                  logger.error(err)
                  logger.debug(JSON.stringify( { success: false, message: "Failed to update the filename" } ))
                  return response.status(200)
                      .send({ success: false, message: "Failed to update the filename" });
                })
              }
            })
            .catch((err) => {
              console.log(err)
              logger.warn(`Failed to update the filename`)
              logger.error(err)
              logger.debug(JSON.stringify( { success: false, message: "Failed to update the filename" } ))
              return response.status(200)
                .send({ success: false, message: "Failed to update the filename" });
            })
          }
        })
        .catch((err) => {
          console.log(err)
          logger.warn(`Failed to update the filename`)
          logger.error(err)
          logger.debug(JSON.stringify( { success: false, message: "Failed to update the filename" } ))
          return response.status(200)
            .send({ success: false, message: "Failed to update the filename" });
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }
}

module.exports = DocumentController