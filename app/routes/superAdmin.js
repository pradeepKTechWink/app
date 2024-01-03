const express = require('express');
const router = express.Router()
const SuperAdminController = require('../controllers/superAdmin')
const auth = require('../middleware/authenticate')

router.route('/get-admin-role')
    .post(auth.verifyToken, auth.adminAccess, SuperAdminController.getRoles)

router.route('/get-admin-env')
    .post(auth.verifyToken, auth.adminAccess, SuperAdminController.getENV)

router.route('/update-admin-env')
    .post(auth.verifyToken, auth.adminAccess, SuperAdminController.updateENV)

module.exports = () => router;
