const express = require('express');
const router = express.Router()
const DocumentController = require('../controllers/documents')
const auth = require('../middleware/authenticate')


router.route('/file-manager/create-folder')
    .post(auth.verifyToken, auth.onlyAdminOrUser, auth.communityExists, auth.isMemberOfCommunity, auth.isValidParent, DocumentController.createNewFolder)

router.route('/file-manager/create-file')
    .post(auth.verifyToken, auth.onlyAdminOrUser, auth.isSenderOwner, auth.communityExists, auth.isMemberOfCommunity, auth.isValidParent, DocumentController.createTextDocument)

router.route('/file-manager/update-file')
    .post(auth.verifyToken, auth.onlyAdminOrUser, auth.isSenderOwner, auth.communityExists, auth.isMemberOfCommunity, auth.isValidParent, auth.isValidFile, DocumentController.updateDocument)

router.route('/profile/get-usage-data')
    .post(auth.verifyToken, auth.adminAccess, auth.companyExist, auth.isCompanyUser, DocumentController.getCompanyUsageData)

router.route('/file-manager/get-folder')
    .post(auth.verifyToken, DocumentController.getFolderData)

router.route('/file-manager/get-file')
    .post(auth.verifyToken, auth.communityExists, auth.isMemberOfCommunity, auth.isValidFileM2, auth.isValidFileExtension, DocumentController.getFile)

router.route('/file-manager/search-files-and-folders')
    .post(auth.verifyToken, auth.communityExists, auth.isMemberOfCommunity, DocumentController.searchFilesAndFolder)

router.route('/file-manager/update-folder')
    .post(auth.verifyToken, auth.onlyAdminOrUser, auth.communityExists, auth.isMemberOfCommunity, auth.isValidFolder, DocumentController.updateFolderData)

router.route('/file-manager/update-filename')
    .post(auth.verifyToken, auth.onlyAdminOrUser, auth.communityExists, auth.isMemberOfCommunity, auth.isValidFile, DocumentController.changeFileName)

router.route('/file-manager/delete-folder')
    .post(auth.verifyToken, auth.onlyAdminOrUser, auth.communityExists, auth.isMemberOfCommunity, auth.isValidFolder, DocumentController.deleteFolder)

router.route('/file-manager/delete-file')
    .post(auth.verifyToken, auth.onlyAdminOrUser, auth.communityExists, auth.isMemberOfCommunity, auth.isValidFile, DocumentController.deleteFile)

router.route('/file-manager/get-child-folders')
    .post(auth.verifyToken, auth.communityExists, auth.isMemberOfCommunity, auth.isValidParent, DocumentController.getChildFoldersAndFiles)

router.route('/file-manager/get-root-folders')
    .post(auth.verifyToken, auth.communityExists, auth.isMemberOfCommunity, DocumentController.getRootFoldersForCommunity)

router.route('/file-manager/get-folder-tree')
    .post(auth.verifyToken, DocumentController.getFolderTreeForFile)

module.exports = () => router;

