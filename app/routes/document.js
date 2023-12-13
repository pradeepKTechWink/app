const express = require('express');
const router = express.Router()
const DocumentController = require('../controllers/documents')
const auth = require('../middleware/authenticate')


router.route('/file-manager/create-folder')
    .post(auth.verifyToken, auth.onlyAdminOrUser, DocumentController.createNewFolder)

router.route('/file-manager/create-file')
    .post(auth.verifyToken, auth.onlyAdminOrUser, DocumentController.createTextDocument)

router.route('/file-manager/update-file')
    .post(auth.verifyToken, auth.onlyAdminOrUser, DocumentController.updateDocument)

router.route('/profile/get-usage-data')
    .post(auth.verifyToken, auth.adminAccess, DocumentController.getCompanyUsageData)

router.route('/file-manager/get-folder')
    .post(auth.verifyToken, auth.onlyAdminOrUser, DocumentController.getFolderData)

router.route('/file-manager/get-file')
    .post(auth.verifyToken, auth.isCompanyUser, DocumentController.getFile)

router.route('/file-manager/search-files-and-folders')
    .post(auth.verifyToken, auth.isCompanyUser, DocumentController.searchFilesAndFolder)

router.route('/file-manager/update-folder')
    .post(auth.verifyToken, auth.onlyAdminOrUser, DocumentController.updateFolderData)

router.route('/file-manager/update-filename')
    .post(auth.verifyToken, auth.onlyAdminOrUser, DocumentController.changeFileName)

router.route('/file-manager/delete-folder')
    .post(auth.verifyToken, auth.onlyAdminOrUser, DocumentController.deleteFolder)

router.route('/file-manager/delete-file')
    .post(auth.verifyToken, auth.onlyAdminOrUser, DocumentController.deleFile)

router.route('/file-manager/get-child-folders')
    .post(auth.verifyToken, auth.isCompanyUser, DocumentController.getChildFoldersAndFiles)

router.route('/file-manager/get-root-folders')
    .post(auth.verifyToken, auth.isCompanyUser, DocumentController.getRootFoldersForCommunity)

router.route('/test')
    .get(DocumentController.getRootFoldersForCommunity)

module.exports = () => router;

