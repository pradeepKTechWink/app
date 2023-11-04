const express = require('express');
const router = express.Router()
const usersController = require('../controllers/user')
const auth = require('../middleware/authenticate')

router.route('/users')
.post(usersController.createUser)

router.route('/verify-user')
.post(usersController.verifyUser)

router.route('/resend-verification-link')
.post(auth.verifyToken, usersController.resendVerificationMail)

router.route('/get-otp')
.post(usersController.validateLoginCredentials)

router.route('/login')
.post(usersController.validateOTPAndAuthenticateUser)

router.route('/forgot_password')
.post(usersController.sendResetPasswordLink)

router.route('/reset-password')
.post(usersController.changePassword)

router.route('/change-current-password')
.post(auth.verifyToken, usersController.changeCurrentPassword)

router.route('/update-email')
.post(auth.verifyToken, usersController.updateEmail)

router.route('/enable-2fa')
.post(auth.verifyToken, usersController.enableTwoFactorAuth)

router.route('/disable-2fa')
.post(auth.verifyToken, usersController.disableTwoFactorAuth)

router.route('/enable-company-2fa')
.post(auth.verifyToken, auth.adminAccess, usersController.enableCompanyTwoFactorAuth)

router.route('/disable-company-2fa')
.post(auth.verifyToken, auth.adminAccess, usersController.disableCompanyTwoFactorAuth)

router.route('/send-invitation')
.post(auth.verifyToken, auth.adminAccess, usersController.sendInvitation)

router.route('/invitation-list')
.post(auth.verifyToken, auth.adminAccess, usersController.getInvitationList)

router.route('/get-invitation')
.post(usersController.getInvitationData)

router.route('/delete-invitations')
.post(auth.verifyToken, auth.adminAccess, usersController.deleteInvitations)

router.route('/delete-invitation')
.post(auth.verifyToken, auth.adminAccess, usersController.deleteInvitation)

router.route('/resend-invitation')
.post(auth.verifyToken, auth.adminAccess, usersController.resendInvitation)

router.route('/create-account-for-invited-user')
.post(usersController.createAccountForInvitedUser)

router.route('/decline-invitation')
.post(usersController.declineInvitation)

router.route('/get-account-stat')
.post(auth.verifyToken, usersController.getAccountStatictic)

router.route('/get-user-detail-for-admin')
.post(auth.verifyToken, auth.adminAccess, usersController.getUserDetailsForAdmin)

router.route('/verify-account-for-admin')
.post(auth.verifyToken, auth.adminAccess, usersController.verifyAccountForAdmin)

router.route('/enable-user-2fa-for-admin')
.post(auth.verifyToken, auth.adminAccess, usersController.enable2FAFordmin)

router.route('/disable-user-2fa-for-admin')
.post(auth.verifyToken, auth.adminAccess, usersController.disable2FAFordmin)

router.route('/change-lock-status-for-admin')
.post(auth.verifyToken, auth.adminAccess, usersController.userLockAndUnlockOptionForAdmin)

router.route('/admin-password-update')
.post(auth.verifyToken, auth.adminAccess, usersController.adminUpdatePasswordOptionForUser)

router.route('/blacklist-user')
.post(auth.verifyToken, auth.adminAccess, usersController.blackListUserAccount)

router.route('/whitelist-user')
.post(auth.verifyToken, auth.adminAccess, usersController.whiteListUserAccount)

module.exports = () => router;