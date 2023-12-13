const express = require('express');
const router = express.Router()
const usersController = require('../controllers/user')
const auth = require('../middleware/authenticate')

router.route('/user/register')
.post(usersController.createUser)

router.route('/user/verify')
.post(usersController.verifyUser)

router.route('/user/resend-verification-link')
.post(auth.verifyToken, usersController.resendVerificationMail)

router.route('/user/login')
.post(usersController.validateLoginCredentials)

router.route('/user/submit-otp')
.post(usersController.validateOTPAndAuthenticateUser)

router.route('/user/forgot_password')
.post(usersController.sendResetPasswordLink)

router.route('/user/reset-password')
.post(usersController.changePassword)

router.route('/profile/change-password')
.post(auth.verifyToken, usersController.changeCurrentPassword)

router.route('/profile/update-email')
.post(auth.verifyToken, usersController.updateEmail)

router.route('/profile/enable-2fa')
.post(auth.verifyToken, usersController.enableTwoFactorAuth)

router.route('/profile/disable-2fa')
.post(auth.verifyToken, usersController.disableTwoFactorAuth)

router.route('/profile/enable-company-2fa')
.post(auth.verifyToken, auth.adminAccess, usersController.enableCompanyTwoFactorAuth)

router.route('/profile/disable-company-2fa')
.post(auth.verifyToken, auth.adminAccess, usersController.disableCompanyTwoFactorAuth)

router.route('/invitation/send')
.post(auth.verifyToken, auth.adminAccess, usersController.sendInvitation)

router.route('/invitation/list')
.post(auth.verifyToken, auth.adminAccess, usersController.getInvitationList)

router.route('/invitation/get')
.post(usersController.getInvitationData)

router.route('/invitation/delete')
.post(auth.verifyToken, auth.adminAccess, usersController.deleteInvitation)

router.route('/invitation/resend')
.post(auth.verifyToken, auth.adminAccess, usersController.resendInvitation)

router.route('/user/create-account-for-invited-user')
.post(usersController.createAccountForInvitedUser)

router.route('/invitation/decline')
.post(usersController.declineInvitation)

router.route('/admin/get-user-detail')
.post(auth.verifyToken, auth.adminAccess, usersController.getUserDetailsForAdmin)

router.route('/admin/verify-account')
.post(auth.verifyToken, auth.adminAccess, usersController.verifyAccountForAdmin)

router.route('/admin/enable-user-2fa')
.post(auth.verifyToken, auth.adminAccess, usersController.enable2FAFordmin)

router.route('/admin/disable-user-2fa')
.post(auth.verifyToken, auth.adminAccess, usersController.disable2FAFordmin)

router.route('/admin/change-lock-status')
.post(auth.verifyToken, auth.adminAccess, usersController.userLockAndUnlockOptionForAdmin)

router.route('/admin/change-password')
.post(auth.verifyToken, auth.adminAccess, usersController.adminUpdatePasswordOptionForUser)

router.route('/admin/blacklist-user')
.post(auth.verifyToken, auth.adminAccess, usersController.blackListUserAccount)

router.route('/admin/whitelist-user')
.post(auth.verifyToken, auth.adminAccess, usersController.whiteListUserAccount)

module.exports = () => router;
