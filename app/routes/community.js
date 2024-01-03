const express = require('express');
const router = express.Router()
const CommunityController = require('../controllers/community')
const auth = require('../middleware/authenticate')

router.route('/community/create')
    .post(auth.verifyToken, auth.adminAccess, auth.companyExist, auth.isCompanyUser, auth.isValidCreator, CommunityController.createNewCommunity)

router.route('/community/update')
    .post(auth.verifyToken, auth.adminAccess, auth.companyExist, auth.communityExists, auth.isCompanyUser, auth.isMemberOfCommunity, CommunityController.updateCommunity)

router.route('/community/check-alias-exist')
    .post(auth.verifyToken, auth.adminAccess, CommunityController.checkIfAliasAlreadyTaken)

router.route('/community/get')
    .post(auth.verifyToken, auth.companyExist, auth.isCompanyUser, CommunityController.getCommunityList)

router.route('/community/activate')
    .post(auth.verifyToken, auth.adminAccess, auth.companyExist, auth.communityExists, auth.isCompanyUser, auth.isMemberOfCommunity, CommunityController.activateCommunity)

router.route('/community/deactivate')
    .post(auth.verifyToken, auth.adminAccess, auth.companyExist, auth.communityExists, auth.isCompanyUser, auth.isMemberOfCommunity, CommunityController.deactivateCommunity)

router.route('/community/get-active-communities')
    .post(auth.verifyToken, auth.companyExist, auth.isCompanyUser, CommunityController.getActiveCommunityList)

module.exports = () => router;
