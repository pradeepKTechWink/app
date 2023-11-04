const dotenv = require('dotenv');
const path = require('path')
var fs = require('fs');
const Documents = require('../services/Documents')
const Users = require('../services/Users')
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

class DocumentController {
    static createNewFolder(request, response) {
      const documents = new Documents(knex)

      documents.createFolder(
        request.body.folderName, 
        request.body.tooltip,
        false,
        request.body.parentId, 
        request.body.communityId
      )
      .then((res) => {
        documents.getChildFoldersAndFiles(request.body.parentId, request.body.communityId)
        .then((res) => {
          return response.status(201)
          .send({ success: true, message: 'Folder created successfully', filesAndFolders: res });
        })
        .catch((err) => {
          return response.status(201)
          .send({ success: true, message: 'Folder created successfully, but failed to fetch updated list' });
        })
      })
      .catch((err) => {
        return response.status(201)
          .send({ success: false, message: 'Failed to create the folder' });
      })
    }

    static getRootFoldersForCommunity(request, response) {
      const documents = new Documents(knex)

      documents.getRootFolders(request.body.communityId)
      .then((_list) => {
        return response.status(201)
            .send({ success: true, filesAndFolders: _list  });
      })
      .catch((err) => {
        return response.status(201)
            .send({ success: false });
      })
    }

    static getChildFoldersAndFiles(request, response) {
      const documents = new Documents(knex)

      documents.getChildFoldersAndFiles(request.body.parentId, request.body.communityId)
      .then((res) => {
        documents.getPredecessorFolders(request.body.parentId)
        .then((predecessFolders) => {
          return response.status(201)
            .send({ success: true, filesAndFolders: res, predecessFolders });
        })
        .catch((err) => {
          return response.status(201)
            .send({ success: true, filesAndFolders: res, predecessFolders: [] });
        })
      })
      .catch((err) => {
        return response.status(201)
            .send({ success: false });
      })
    }

    static getPreviousFilesAndFolders(request, response) {
      const documents = new Documents(knex)

      documents.getParentId(request.body.folderId)
      .then((parentId) => {
        documents.getParentId(parentId)
        .then((_parentId2) => {
          documents.getChildFoldersAndFiles(_parentId2, request.body.communityId)
          .then((res) => {
            return response.status(201)
            .send({ success: true, filesAndFolders: res  });
          })
          .catch((err) => {
            return response.status(201)
            .send({ success: false });
          })
        })
      })
    }

    static deleteFolder(request, response) {
      const documents = new Documents(knex)

      documents.deleteFolder(request.body.folderId, request.body.communityId)
      .then((res) => {
        if(res == 1) {
          if(request.body.searchString.length > 0) {
            documents.searchFilesAndFolders(request.body.searchString, request.body.communityId)
            .then((searchResult) => {
              return response.status(200)
                      .send({ success: true, message: "Folder deleted successfully", filesAndFolders: searchResult, predecessFolders: [] });
            })
            .catch((err) => {
              console.log(err)
              return response.status(201)
                      .send({ success: false,  message: "Failed to delete folder" });
            })
          } else {
            documents.getChildFoldersAndFiles(request.body.parentId, request.body.communityId)
            .then((res) => {
              return response.status(201)
                  .send({ success: true, message: "Folder deleted successfully", filesAndFolders: res  });
            })
            .catch((err) => {
              return response.status(201)
                  .send({ success: false, message: "Failed to delete folder" });
            })
          }
        } else {
          return response.status(201)
                .send({ success: false, message: "Failed to delete folder" });
        }
      })
      .catch((err) => {
        console.log(err)
        return response.status(201)
                .send({ success: false, message: "Failed to delete folder" });
      })
    }

    static deleFile(request, response) {
      const documents = new Documents(knex)
      documents.deleteFile(request.body.fileId, request.body.communityId)
      .then((res) => {
        if(res == 1) {
          if(request.body.searchString.length > 0) {
            documents.searchFilesAndFolders(request.body.searchString, request.body.communityId)
            .then((searchResult) => {
              return response.status(200)
                      .send({ success: true, message: "File deleted successfully", filesAndFolders: searchResult, predecessFolders: [] });
            })
            .catch((err) => {
              console.log(err)
              return response.status(201)
                      .send({ success: false,  message: "Failed to delete file" });
            })
          } else {
            documents.getChildFoldersAndFiles(request.body.parentId, request.body.communityId)
            .then((res) => {
              return response.status(201)
                  .send({ success: true, message: "File deleted successfully", filesAndFolders: res  });
            })
            .catch((err) => {
              return response.status(201)
                  .send({ success: false, message: "Failed to delete file" });
            })
          }
        } else {
          return response.status(201)
                .send({ success: false, message: "Failed to delete file" });
        }
      })
      .catch((err) => {
        return response.status(201)
                .send({ success: false, message: "Failed to delete file" });
      })
    }

    static getFolderData(request, response) {
      const documents = new Documents(knex)

      documents.getFolderData(request.body.folderId)
      .then((folderData) => {
        return response.status(201)
          .send({ success: true, folderData });
      })
      .catch((err) => {
        return response.status(201)
                .send({ success: false });
      })
    }

    static updateFolderData(request, response) {
      const documents = new Documents(knex)

      documents.updateFolder(request.body.folderId, request.body.folderName, request.body.folderDescription)
      .then((res) => {
        if(res == 1) {
          if(request.body.searchString.length > 0) {
            documents.searchFilesAndFolders(request.body.searchString, request.body.communityId)
            .then((searchResult) => {
              return response.status(200)
                      .send({ success: true, message: "Folder updated successfully", filesAndFolders: searchResult, predecessFolders: [] });
            })
            .catch((err) => {
              console.log(err)
              return response.status(201)
                      .send({ success: false,  message: "Folder updated successfully, but failed to fetch the updated data" });
            })
          } else {
            documents.getChildFoldersAndFiles(request.body.parentId, request.body.communityId)
            .then((res) => {
              return response.status(201)
                  .send({ success: true, message: "Folder updated successfully", filesAndFolders: res  });
            })
            .catch((err) => {
              return response.status(201)
                  .send({ success: false, message: "Folder updated successfully, but failed to fetch the updated data" });
            })
          }
        } else {
          return response.status(201)
                .send({ success: false, message: "Failed to update the folder" });
        }
      })
    }

    static getFile(request, response) {
      const documents = new Documents(knex)

      const mimeTypeMap = {
        'docx' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc' : 'application/msword',
        'xlsx' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls' : 'application/vnd.ms-excel',
        'pdf' : 'application/pdf',
        'txt' : 'text/plain;charset=utf-8',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      }

      documents.getDocumentPath(request.body.fileId, request.body.communityId)
      .then((res) => {
        console.log(res)
        if(res == 'file-not-found') {
          return response.status(201)
                .send({ success: false, message: "File not found" });
        } else {
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
        console.log(err)
        return response.status(201)
                .send({ success: false, message: "Failed to fetch the document" });
      })
    }

    static searchFilesAndFolder(request, response) {
      const documents = new Documents(knex)

      documents.searchFilesAndFolders(request.body.searchString, request.body.communityId)
      .then((searchResult) => {
        return response.status(200)
                .send({ success: true, filesAndFolders: searchResult, predecessFolders: [] });
      })
      .catch((err) => {
        console.log(err)
        return response.status(201)
                .send({ success: false });
      })
    }

    static getCompanyUsageData(request, response) {
      const documents = new Documents(knex) 
      const users = new Users(knex)

      documents.getStorageOccupationDetail(request.body.companyId)
      .then((storageOccupationData) => {
        users.getCompanyUserCount(request.body.companyId)
        .then((userCount) => {
          return response.status(200)
                .send({ success: true, storageOccupationData, userCount });
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
}

module.exports = DocumentController