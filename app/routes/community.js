const express = require('express');
const router = express.Router()
const CommunityController = require('../controllers/community')
const auth = require('../middleware/authenticate')

router.route('/create-community')
    .post(auth.verifyToken, auth.adminAccess, CommunityController.createNewCommunity)

router.route('/update-community')
    .post(auth.verifyToken, auth.adminAccess, CommunityController.updateCommunity)

router.route('/check-alias-exist')
    .post(auth.verifyToken, auth.adminAccess, CommunityController.checkIfAliasAlreadyTaken)

router.route('/check-alias-exist-for-update')
    .post(auth.verifyToken, auth.adminAccess, CommunityController.checkIfAliasAlreadyTakenForUpdate)

router.route('/get-communities')
    .post(auth.verifyToken, CommunityController.getCommunityList)

// router.route('/delete-community')
//     .post(auth.verifyToken, auth.adminAccess, CommunityController.deleteCommunity)

router.route('/activate-community')
    .post(auth.verifyToken, auth.adminAccess, CommunityController.activateCommunity)

router.route('/deactivate-community')
    .post(auth.verifyToken, auth.adminAccess, CommunityController.deactivateCommunity)

router.route('/get-active-communities')
    .post(auth.verifyToken, auth.isCompanyUser, CommunityController.getActiveCommunityList)

module.exports = () => router;