const express = require('express');
const router = express.Router()
const CommunityController = require('../controllers/community')
const auth = require('../middleware/authenticate')

router.route('/community/create')
    .post(auth.verifyToken, auth.adminAccess, CommunityController.createNewCommunity)

router.route('/community/update')
    .post(auth.verifyToken, auth.adminAccess, CommunityController.updateCommunity)

router.route('/community/check-alias-exist')
    .post(auth.verifyToken, auth.adminAccess, CommunityController.checkIfAliasAlreadyTaken)

router.route('/community/check-alias-exist-for-update')
    .post(auth.verifyToken, auth.adminAccess, CommunityController.checkIfAliasAlreadyTakenForUpdate)

router.route('/community/get')
    .post(auth.verifyToken, CommunityController.getCommunityList)

// router.route('/delete-community')
//     .post(auth.verifyToken, auth.adminAccess, CommunityController.deleteCommunity)

router.route('/community/activate')
    .post(auth.verifyToken, auth.adminAccess, CommunityController.activateCommunity)

router.route('/community/deactivate')
    .post(auth.verifyToken, auth.adminAccess, CommunityController.deactivateCommunity)

router.route('/community/get-active-communities')
    .post(auth.verifyToken, auth.isCompanyUser, CommunityController.getActiveCommunityList)

module.exports = () => router;
