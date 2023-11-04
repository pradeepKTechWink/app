const express = require('express');
const router = express.Router()
const DocumentController = require('../controllers/documents')
const auth = require('../middleware/authenticate')


router.route('/create-folder')
    .post(auth.verifyToken, auth.onlyAdminOrUser, DocumentController.createNewFolder)

router.route('/get-usage-data')
    .post(auth.verifyToken, auth.adminAccess, DocumentController.getCompanyUsageData)

router.route('/get-folder')
    .post(auth.verifyToken, auth.onlyAdminOrUser, DocumentController.getFolderData)

router.route('/get-file')
    .post(auth.verifyToken, auth.isCompanyUser, DocumentController.getFile)

router.route('/search-files-and-folders')
    .post(auth.verifyToken, auth.isCompanyUser, DocumentController.searchFilesAndFolder)

router.route('/update-folder')
    .post(auth.verifyToken, auth.onlyAdminOrUser, DocumentController.updateFolderData)

router.route('/delete-folder')
    .post(auth.verifyToken, auth.onlyAdminOrUser, DocumentController.deleteFolder)

router.route('/delete-file')
    .post(auth.verifyToken, auth.onlyAdminOrUser, DocumentController.deleFile)

router.route('/get-child-folders')
    .post(auth.verifyToken, auth.isCompanyUser, DocumentController.getChildFoldersAndFiles)

router.route('/get-root-folders')
    .post(auth.verifyToken, auth.isCompanyUser, DocumentController.getRootFoldersForCommunity)

module.exports = () => router;

