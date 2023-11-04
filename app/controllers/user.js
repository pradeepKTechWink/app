var jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Users = require('../services/Users')
const hbs = require('nodemailer-express-handlebars');
const nodemailer = require('nodemailer');
const path = require('path')
const winston = require('winston');
const { combine, timestamp, json } = winston.format;
const LocaleService = require('../services/localeService');
const i18n =  require('../i18n.config');

const localeService = new LocaleService(i18n);

localeService.setLocale('en');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), json()),
  transports: [
    new winston.transports.File({
      filename: '../../logs/combined.log',
    }),
  ],
});

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

var transporter = nodemailer.createTransport(
    {
        service: 'gmail',
        auth:{
            user: process.env.MAIL_ADDRESS,
            pass: process.env.MAIL_PASSWORD
        }
    }
);

const handlebarOptions = {
    viewEngine: {
        partialsDir: path.resolve('./views/'),
        defaultLayout: false,
    },
    viewPath: path.resolve('./views/'),
};

transporter.use('compile', hbs(handlebarOptions))


class UsersController {
    static createUser(request, response) {
        const user = new Users(knex)
        console.log(request.body)
        
        user.checkIfUserExist(request.body.email)
        .then((res) => {
            if(res.length > 0) {
                return response.status(200)
                    .send({ success: false, message: `${request.body.email} already has an account, try with another email` });
            } else {
                user.createNewUser(
                    request.body.firstname,
                    request.body.lastname,
                    request.body.email,
                    request.body.mobileNumber,
                    request.body.password,
                ).then((res) => {

                    const { userId, token } = res

                    user.createNewCompany(
                        userId,
                        request.body.companyName,
                        request.body.phoneNumber,
                        request.body.orgType,
                        request.body.mailingAddStreetName,
                        request.body.mailingAddCityName,
                        request.body.mailingAddStateName,
                        request.body.mailingAddZip,
                        request.body.billingAddStreetName,
                        request.body.billingAddCityName,
                        request.body.billingAddStateName,
                        request.body.billingAddZip,
                        request.body.isMailAndBillAddressSame
                    )
                    .then((res) => {

                        const { companyId } = res

                        if(companyId) {
                            const jwtToken = jwt.sign({
                                userId: userId,
                                firstname: request.body.firstname,
                                lastname: request.body.lastname,
                                email: request.body.email,
                                role: 1,
                                company: companyId[0]
                            }, process.env.TOKEN_SECRET, { expiresIn: '2 days' });
        
                            const data = {
                                id: userId,
                                firstname: request.body.firstname,
                                lastname: request.body.lastname,
                                email: request.body.email,
                                accountStatus: false,
                                phoneNumber: request.body.phoneNumber,
                                role: 1,
                                mobileNumber: request.body.mobileNumber,
                                companyId: companyId[0],
                                companyName: request.body.companyName,
                                orgType: request.body.orgType,
                                mailingAddress: {
                                    addressLine: request.body.mailingAddStreetName,
                                    city: request.body.mailingAddCityName,
                                    state: request.body.mailingAddStateName,
                                    postCode: request.body.mailingAddZip
                                },
                                auth: {
                                    api_token: jwtToken
                                },
                                billingAddress: {
                                    addressLine: request.body.billingAddStreetName,
                                    city: request.body.billingAddCityName,
                                    state: request.body.billingAddStateName,
                                    postCode: request.body.billingAddZip
                                },
                                avatarName: 'default.png',
                                twoFactorAuth: false,
                                companyLogo: 'default.png',
                                companytwoFactorAuth: false,
                                isMailAndBillAddressSame: request.body.isMailAndBillAddressSame
                            }
        
                            var mailOptions2 = {
                                from: '<testpradeep131@gmail.com>',
                                to: request.body.email,
                                subject: 'Welcome Aboard',
                                template: 'welcome',
                                context:{
                                    name: request.body.firstname
                                }
                            };
        
                            transporter.sendMail(mailOptions2, function(error, info){
                                if(error){
                                    logger.error(error.message)
                                    return console.log(error);
                                }
                                console.log('Message sent: ' + info.response);
                            });
        
                            var mailOptions = {
                                from: '<testpradeep131@gmail.com>',
                                to: request.body.email,
                                subject: 'Account Verification',
                                template: 'email',
                                context:{
                                    name: request.body.firstname,
                                    link: `${process.env.FRONTEND_BASE_URL}/verify-account?id=${userId}&token=${token}`
                                }
                            };
        
                            transporter.sendMail(mailOptions, function(error, info){
                                if(error){
                                    logger.error(error.message)
                                    return console.log(error);
                                }
                                console.log('Message sent: ' + info.response);
                            });
        
                            return response.status(201)
                                .send({ success: true, message: request.t('accountCreationSuccess'), userData: data  });
                        } else {
                            return response.status(201)
                                .send({ success: false, message: request.t('accountCreationFailed') });
                        }
                    })
                    .catch((err) => {
                        return response.status(201)
                                .send({ success: false, message: request.t('accountCreationFailed') });
                    })
                })
                .catch((err) => {
                    console.log(err)
                    logger.error(err)
                    return response.status(400)
                            .send({success: false, message: err});
                })
            }
        })
    }

    static verifyUser(request, response) {
        const user = new Users(knex)

        user.validateToken(
            request.body.userId,
            request.body.token
        )
        .then((res) => {
            if(res == 'valid') {
                user.verifyAccount(request.body.userId)
                .then((res) => {
                    if(res == 1) {
                        return response.status(200)
                            .send({success: true, message: request.t('accountVerificationSuccess')});
                    } else {
                        return response.status(200)
                            .send({success: false, message: request.t('accountVerificationFailed')});
                    }
                })
                .catch((err) => {
                    console.log(err)
                    logger.error(err)
                    return response.status(200)
                            .send({success: false, message: request.t('accountVerificationFailed')});
                })
            } else if(res == 'expired') {
                return response.status(200)
                            .send({success: false, message: request.t('verifyLinkExpired')});
            } else {
                return response.status(200)
                            .send({success: false, message: request.t('verifyLinkInvalid')});
            }
        })
        .catch((err) => {
            console.log(err)
            logger.error(err)
            return response.status(200)
                            .send({success: false, message: request.t('accountVerificationFailed')});
        })
    }

    static resendVerificationMail(request, response) {
        const user = new Users(knex)

        user.resetToken(request.body.userId)
        .then((result) => {
            const { res, token } = result
            if(res == 1) {
                user.getUserDetailsById(request.body.userId)
                .then((user) => {
                    var mailOptions = {
                        from: '<testpradeep131@gmail.com>',
                        to: user.email,
                        subject: 'Account Verification',
                        template: 'email',
                        context:{
                            name: user.firstname,
                            link: `${process.env.FRONTEND_BASE_URL}/verify-account?id=${user.id}&token=${token}`
                        }
                    };
    
                    transporter.sendMail(mailOptions, function(error, info){
                        if(error){
                            console.log(error);
                            logger.error(error.message)
                            return response.status(200)
                            .send({success: false, message: request.t('verifyLinkSendFailed')});
                        }
                        console.log('Message sent: ' + info.response);
    
                        return response.status(200)
                            .send({success: true, message: request.t('verifyLinkSendSuccess')});
                    });
                })
            } else {
                return response.status(200)
                        .send({success: false, message: request.t('verifyLinkSendFailed')});
            }
        })
        .catch((err) => {
            logger.error(err)
            return response.status(200)
            .send({success: false, message: request.t('verifyLinkSendFailed')});
        })
    }

    static validateLoginCredentials(request, response) {
        const user = new Users(knex)
        user.validateLoginCredential(request.body.email, request.body.password)
        .then((res) => {
            if(res.stat == 'valid') {

                user.getUserDetails(request.body.email)
                .then((data) => {
                    let userData = data

                    if(!userData.accountBlocked) {
                        user.is2FAEnabled(userData.id)
                        .then((res) => {
                            if(res == 'disabled') {

                                user.getCompanyRole(userData.id)
                                .then((roleData) => {
                                    user.getCompanyDetails(roleData.company)
                                    .then((companyData) => {
                                        const jwtToken = jwt.sign({
                                            userId: userData.id,
                                            firstname: userData.firstname,
                                            email: userData.email,
                                            role: roleData.role,
                                            company: roleData.company
                                        }, process.env.TOKEN_SECRET, { expiresIn: '30 days' });
                    
                                        let _auth = {
                                            auth: {
                                                api_token: jwtToken
                                            }
                                        }

                                        userData = {...userData, ...companyData, ..._auth, role: roleData.role}

                                        return response.status(200)
                                        .send({ success: true, message: request.t('Authentication Success'), userData, twoFactorAuth: false });
                                    })
                                })
                                .catch((err) => {
                                    console.log(err)
                                    return response.status(200)
                                            .send({success: false, message: request.t('loginFailed')});
                                })
                                
                            } else {
                                let userId = userData.id

                                user.generateOTP(userId)
                                .then((otp) => {
                                    var mailOptions = {
                                        from: '<testpradeep131@gmail.com>',
                                        to: request.body.email,
                                        subject: 'Login OTP',
                                        template: 'otp',
                                        context:{
                                            otp: otp
                                        }
                                    };
                    
                                    transporter.sendMail(mailOptions, function(error, info){
                                        if(error){
                                            logger.error(error.message)
                                            return console.log(error);
                                        }
                                        console.log('Message sent: ' + info.response);
                                    });
                    
                                    return response.status(200)
                                        .send({success: true, message: 'Valid credential', twoFactorAuth: true});
                                })
                                .catch((err) => {
                                    logger.error(err)
                                    return response.status(200)
                                        .send({success: false, message: request.t('invalidCredential')});
                                })
                            }
                        })
                    } else {
                        return response.status(200)
                        .send({success: false, message: request.t('accountDeleted')});
                    }
                })
                
            } else if(res.stat == 'locked') {
                return response.status(200)
                    .send({success: false, message: request.t('accountLocked')});
            } else {
                return response.status(200)
                    .send({success: false, message: request.t('invalidCredential')});
            }
        })
        .catch((err) => {
            logger.error(err)
            return response.status(200)
                    .send({success: false, message: request.t('loginFailed')});
        })
    }

    static validateOTPAndAuthenticateUser(request, response) {
        const user = new Users(knex)

        user.validateCredentialAndOtp(
            request.body.email,
            request.body.password,
            request.body.otp
        )
        .then((res) => {
            if(res == 'valid') {
                user.getUserDetails(request.body.email)
                .then((data) => {
                    let userData = data

                    if(!userData.accountBlocked) {
                        user.getCompanyRole(userData.id)
                        .then((roleData) => {
                            user.getCompanyDetails(roleData.company)
                            .then((companyData) => {
                                const jwtToken = jwt.sign({
                                    userId: userData.id,
                                    firstname: userData.firstname,
                                    email: userData.email,
                                    role: roleData.role,
                                    company: roleData.company
                                }, process.env.TOKEN_SECRET, { expiresIn: '30 days' });
            
                                let _auth = {
                                    auth: {
                                        api_token: jwtToken
                                    }
                                }

                                userData = {...userData, ...companyData, ..._auth, role: roleData.role}

                                return response.status(200)
                                .send({ success: true, message: 'Authentication Success', userData, twoFactorAuth: false });
                            })
                        })
                        .catch((err) => {
                            console.log(err)
                            return response.status(200)
                                    .send({success: false, message: request.t('loginFailed')});
                        })
                    } else {
                        return response.status(200)
                            .send({success: false, message: request.t('accountDeleted')});
                    }
                })
            } else if( res == 'expired') {
                return response.status(201)
                        .send({ success: false, message: request.t('OTPExpired') });
            } else if(res == 'Invalid OTP') {
                user.getUserDetails(request.body.email)
                .then((data) => {
                    let userData = data

                    var mailOptions = {
                        from: '<testpradeep131@gmail.com>',
                        to: userData.email,
                        subject: 'App Security',
                        template: 'account_locked',
                        context:{
                            name: userData.firstname
                        }
                    };

                    transporter.sendMail(mailOptions, function(error, info){
                        if(error){
                            logger.error(error.message)
                            return console.log(error);
                        }
                        console.log('Message sent: ' + info.response);
                    });
                    return response.status(201)
                        .send({ success: false, message: request.t('invalidOTP') });
                })
            } else if(res == 'locked') {
                return response.status(201)
                        .send({ success: false, message: request.t('accountLocked') });
            } else {
                return response.status(201)
                        .send({ success: false, message: request.t('invalidCredential') });
            }
        })
    }

    static sendResetPasswordLink(request, response) {
        const user = new Users(knex)

        user.checkIfUserExist(request.body.email)
        .then((res) => {
            if(res.length > 0) {
                user.getUserDetails(request.body.email)
                .then((data) => {
                    const userData = data

                    user.resetToken(userData.id)
                    .then((result) => {
                        const { res, token } = result
                        if(res == 1) {
                            var mailOptions = {
                                from: '<testpradeep131@gmail.com>',
                                to: userData.email,
                                subject: 'Reset Password',
                                template: 'password_reset',
                                context:{
                                    name: userData.firstname,
                                    link: `${process.env.FRONTEND_BASE_URL}/auth/reset-password?id=${userData.id}&token=${token}`
                                }
                            };
            
                            transporter.sendMail(mailOptions, function(error, info){
                                if(error){
                                    console.log(error);
                                    logger.error(error.message)
                                    return response.status(200)
                                    .send({success: false, message: request.t('resetPassLinkSendFailed')});
                                }
                                console.log('Message sent: ' + info.response);
            
                                return response.status(200)
                                    .send({success: true, message: request.t('resetPassLinkSendSuccess')});
                            });
                        } else {
                            return response.status(200)
                                .send({success: false, message: request.t('resetPassLinkSendFailed')});
                        }
                    })
                    .catch((err) => {
                        console.log(err)
                        logger.error(err)
                        return response.status(200)
                        .send({success: false, message: request.t('resetPassLinkSendFailed')});
                    })
                })
            } else {
                return response.status(200)
                    .send({success: false, message: `${request.body.email} ${request.t('emailNotExist')}`});
            }
        })
        .catch((err) => {
            console.log(err)
            logger.error(err)
            return response.status(200)
                .send({success: false, message: request.t('resetPassLinkSendFailed')});
        })
    }

    static changePassword(request, response) {
        const user = new Users(knex)

        user.validateToken(
            request.body.userId,
            request.body.token
        ).then((res) => {
            if(res == 'valid') {
                user.updatePassword(request.body.userId, request.body.password)
                .then((res) => {
                    if(res == 1) {
                        return response.status(200)
                            .send({success: true, message: request.t('passChangeSuccess')});
                    } else {
                        return response.status(200)
                            .send({success: false, message: request.t('passChangeFailed')});
                    }
                })
            } else if(res == 'invalid token') {
                return response.status(200)
                    .send({success: false, message: request.t('resetPassLinkInvalid')});
            } else if(res == 'expired') {
                return response.status(200)
                            .send({success: false, message: request.t('resetPassLinkExpired')});
            }
        })
        .catch((err) => {
            logger.error(err)
            return response.status(200)
                            .send({success: false, message: request.t('passChangeFailed')});
        })
    }

    static changeCurrentPassword(request, response) {
        const user = new Users(knex)

        console.log(request.decoded)
        user.validatePasswordByUserId(request.body.userId, request.body.currentPassword)
        .then((res) => {
            if(res == 'valid') {
                user.updatePassword(request.body.userId, request.body.newPassword)
                .then((res) => {
                    if(res == 1) {
                        return response.status(200)
                            .send({success: true, message: request.t('passwordUpdateSuccess')});
                    } else {
                        return response.status(200)
                            .send({success: false, message: request.t('passwordUpdateFailed') });
                    }
                })
            } else {
                return response.status(200)
                            .send({success: false, message: request.t('invalidPassword')});
            }
        })
        .catch((err) => {
            logger.error(err)
            console.log(err)
            return response.status(200)
                            .send({success: false, message: request.t('passwordUpdateFailed') });
        })
    }

    static updateEmail(request, response) {
        const user = new Users(knex)

        user.isUpdatingSameEmail(request.body.userId, request.body.newEmail)
        .then((isSameEmail) => {
            if(isSameEmail == 'no') {
                user.validatePasswordByUserId(request.body.userId, request.body.password)
                .then((res) => {
                    if(res == 'valid') {
                        user.updateEmail(request.body.userId, request.body.newEmail)
                        .then((res) => {
                            if(res == 1) {
                                user.resetToken(request.body.userId)
                                .then(async (result) => {
                                    const { res, token } = result
                                    if(res == 1) {
                                        await user.updateUserMeta(request.body.userId, '2FA', 0)
                                        user.getUserDetailsById(request.body.userId)
                                        .then((user) => {
                                            var mailOptions = {
                                                from: '<testpradeep131@gmail.com>',
                                                to: user.email,
                                                subject: 'Email Verification',
                                                template: 'email',
                                                context:{
                                                    name: user.firstname,
                                                    link: `${process.env.FRONTEND_BASE_URL}/verify-account?id=${user.id}&token=${token}`
                                                }
                                            };
                            
                                            transporter.sendMail(mailOptions, function(error, info){
                                                if(error){
                                                    console.log(error);
                                                    logger.error(error.message)
                                                    return response.status(200)
                                                    .send({success: false, message: request.t('verifyLinkSendFailed')});
                                                }
                                                console.log('Message sent: ' + info.response);
                            
                                                return response.status(200)
                                                    .send({
                                                        success: true, 
                                                        message: request.t('emailUpdateSuccess'), 
                                                        email: request.body.newEmail,
                                                        accountStatus: false
                                                    });
                                            });
                                        })
                                    } else {
                                        return response.status(200)
                                                .send({success: false, message: request.t('emailUpdateFailed')});
                                    }
                                })
                                .catch((err) => {
                                    logger.error(err)
                                    console.log(err)
                                    return response.status(200)
                                    .send({success: false, message: request.t('emailUpdateFailed')});
                                })
                            }
                        })
                    } else {
                        return response.status(200)
                                    .send({success: false, message: request.t('invalidPassword')});
                    }
                })
                .catch((err) => {
                    console.log(err)
                    logger.error(err)
                    return response.status(200)
                                    .send({success: false, message: request.t('emailUpdateFailed')});
                })
            } else {
                return response.status(200)
                    .send({success: false, message: request.t('sameEmail')});
            }
        })
        .catch((err) => {
            console.log(err)
            logger.error(err)
            return response.status(200)
                .send({success: false, message: request.t('emailUpdateFailed')});
        })
    }

    static enableTwoFactorAuth(request, response) {
        const user = new Users(knex)

        user.enable2FA(request.body.userId)
        .then((res) => {
            if(res == 1) {
                return response.status(200)
                        .send({success: true, message: request.t('2FAEnableSuccess')});
            } else {
                return response.status(200)
                        .send({success: false, message: request.t('2FAEnableFailed') });
            }
        })
        .catch((err) => {
            console.log(err)
            logger.error(err)
            return response.status(200)
                        .send({success: false, message: request.t('2FAEnableFailed') });
        })
    }

    static disableTwoFactorAuth(request, response) {
        const user = new Users(knex)

        user.disable2FA(request.body.userId)
        .then((res) => {
            if(res == 1) {
                return response.status(200)
                        .send({success: true, message: 'Two factor authentication disabled'});
            } else {
                return response.status(200)
                        .send({success: false, message: 'Failed to disable two factor authentication'});
            }
        })
        .catch((err) => {
            console.log(err)
            logger.error(err)
            return response.status(200)
                        .send({success: false, message: 'Failed to disable two factor authentication'});
        })
    }

    static enableCompanyTwoFactorAuth(request, response) {
        const user = new Users(knex)

        user.enableCompany2FA(request.body.companyId, request.body.userId)
        .then((res) => {
            if(res == 1) {
                user.enable2FAForAllCompanyUsers(request.body.companyId)
                .then((res) => {
                    if(res == 1) {
                        return response.status(200)
                            .send({success: true, message: 'Two factor authentication enabled for company and for all of its users'});
                    } else {
                        return response.status(200)
                        .send({success: false, message: 'Two factor authentication enabled for company but failed to enable for its users'});
                    }
                })
            } else {
                return response.status(200)
                        .send({success: false, message: 'Failed to enable two factor authentication for company'});
            }
        })
        .catch((err) => {
            logger.error(err)
            return response.status(200)
                        .send({success: false, message: 'Failed to enable two factor authentication for company'});
        })
    }

    static disableCompanyTwoFactorAuth(request, response) {
        const user = new Users(knex)

        user.disableCompany2FA(request.body.companyId)
        .then((res) => {
            if(res == 1) {
                user.disable2FAForAllCompanyUsers(request.body.companyId)
                .then((res) => {
                    if(res == 1) {
                        return response.status(200)
                            .send({success: true, message: 'Two factor authentication disabled for company and for all of its users'});
                    } else {
                        return response.status(200)
                        .send({success: false, message: 'Two factor authentication disabled for company but failed to disable for its users'});
                    }
                })
            } else {
                return response.status(200)
                        .send({success: false, message: 'Failed to disable two factor authentication for company'});
            }
        })
        .catch((err) => {
            console.log(err)
            logger.error(err)
            return response.status(200)
                        .send({success: false, message: 'Failed to disable two factor authentication for company'});
        })
    }

    static getAccountStatictic(request, response) {
        const user = new Users(knex)

        user.getAccountStatistic(request.body.userId)
        .then((statData) => {
            if(statData) {
                return response.status(200)
                        .send({success: true, message: 'Account stat fetched successfully', statData});
            } else {
                return response.status(200)
                        .send({success: false, message: 'Failed to fetch account stat data'});
            }
        })
        .catch((err) => {
            console.log(err)
            logger.error(err)
            return response.status(200)
                        .send({success: false, message: 'Failed to fetch account stat data'});
        })
    }

    static sendInvitation(request, response) {
        const user = new Users(knex)

        user.checkIfUserExist(request.body.email)
        .then((res) => {
            if(res.length > 0) {
                return response
                .send({success: false, message: 'Cannot send invitation, account already exist for the email'});
            } else {
                user.isInvitationSent(request.body.email)
                .then((inviteSent) => {
                    if(inviteSent == 'no') {
                        user.addInvitationDetails(
                            request.body.email,
                            request.body.senderId,
                            request.body.role,
                            request.body.companyId
                        )
                        .then((res) => {
                            const { invitationId, token } = res
                
                            user.getUserDetailsById(request.body.senderId)
                            .then((_sender) => {
                                const senderName = _sender.firstname
                
                                user.getCompanyDetails(request.body.companyId)
                                .then((companyData) => {
                
                                    if(companyData) {
                                        var mailOptions2 = {
                                            from: '<testpradeep131@gmail.com>',
                                            to: request.body.email,
                                            subject: 'Invitation',
                                            template: 'invitation',
                                            context:{
                                                sender: senderName,
                                                company: companyData.companyName,
                                                acceptLink: `${process.env.FRONTEND_BASE_URL}/auth/create-account?email=${request.body.email}&token=${token}`,
                                                denyLink: `${process.env.FRONTEND_BASE_URL}/auth/decline-invitation?email=${request.body.email}&token=${token}`
                                            }
                                        };
                        
                                        transporter.sendMail(mailOptions2, function(error, info){
                                            if(error){
                                                logger.error(error.message)
                                                return console.log(error);
                                            }
                                            console.log('Message sent: ' + info.response);
                                        });
                
                                        return response.status(200)
                                                .send({success: true, message: 'Invitation sent successfully'});
                                    } else {
                                        console.log('No Company data')
                                        return response.status(200)
                                                .send({success: false, message: 'Failed to send invitation'});
                                    }
                                })
                                .catch((err) => {
                                    logger.error(err)
                                    console.log(err)
                                    return response.status(200)
                                            .send({success: false, message: 'Failed to send invitation'});
                                })
                            })
                            .catch((err) => {
                                logger.error(err)
                                console.log(err)
                                return response.status(200)
                                        .send({success: false, message: 'Failed to send invitation'});
                            })
                        })
                        .catch((err) => {
                            logger.error(err)
                            console.log(err)
                            return response.status(200)
                                    .send({success: false, message: 'Failed to send invitation'});
                        })
                    } else {
                        return response.status(200)
                            .send({success: false, message: 'Invitation already sent, delete that and try again'});
                    }
                })
            }
        })
        .catch((err) => {
            logger.error(err)
            console.log(err)
            return response.status(200)
                    .send({success: false, message: 'Failed to send invitation'});
        })
    }

    static getInvitationList(request, response) {
        const user = new Users(knex)

        if(request.body.searchString && request.body.searchString != '') {
            user.searchUser(
                request.body.searchString,
                request.body.offset,
                request.body.limit,
                request.body.companyId
            )
            .then((invitationList) => {
                user.getTotalNumberOfPageForFilteredInvitationList(
                    request.body.limit, 
                    request.body.companyId,
                    request.body.searchString
                )
                .then((recordCounts) => {
                    const {totalPageNum, noOfRecords} = recordCounts
                    return response.status(200)
                        .send({success: true, invitationList, totalPageNum, noOfRecords});
                })
            })
            .catch((err) => {
                logger.error(err)
                return response.status(200)
                    .send({success: false, message: 'Failed to fetch invitation list'});
            })
        } else {
            user.getInvitationList(
                request.body.offset,
                request.body.limit,
                request.body.companyId
            )
            .then((invitationList) => {
                user.getTotalNumberOfPageForInvitationList(request.body.limit, request.body.companyId)
                .then((recordCounts) => {
                    const {totalPageNum, noOfRecords} = recordCounts
                    return response.status(200)
                        .send({success: true, invitationList, totalPageNum, noOfRecords});
                })
            })
            .catch((err) => {
                logger.error(err)
                return response.status(200)
                        .send({success: false, message: 'Failed to fetch invitation list'});
            })
        }
    }

    static deleteInvitations(request, response) {
        const user = new Users(knex)

        user.deleteInvitations(
            request.body.invitationIds
        )
        .then((res) => {
            if(res == 1) {
                user.getInvitationList(
                    0,
                    request.body.limit,
                    request.body.companyId
                )
                .then((invitationList) => {
                    user.getTotalNumberOfPageForInvitationList(request.body.limit, request.body.companyId)
                    .then((recordCounts) => {
                        const {totalPageNum, noOfRecords} = recordCounts
                        return response.status(200)
                            .send({success: true, invitationList, totalPageNum, noOfRecords, message: 'Users deleted successfully'});
                    })
                })
                .catch((err) => {
                    logger.error(err)
                    console
                    return response.status(200)
                            .send({success: false, message: 'Users deleted successfully, but failed to fetch updated invitation list'});
                })
            }
        })
        .catch((err) => {
            logger.error(err)
            console.log(err)
            return response.status(200)
                .send({success: false, message: 'Failed to delete invitations'});
        })
    }

    static deleteInvitation(request, response) {
        const user = new Users(knex)

        user.deleteInvitation(
            request.body.invitationId
        )
        .then((res) => {
            if(res == 1) {
                user.getInvitationList(
                    0,
                    request.body.limit,
                    request.body.companyId
                )
                .then((invitationList) => {
                    user.getTotalNumberOfPageForInvitationList(request.body.limit, request.body.companyId)
                    .then((recordCounts) => {
                        const {totalPageNum, noOfRecords} = recordCounts
                        return response.status(200)
                            .send({success: true, invitationList, totalPageNum, noOfRecords, message: 'User deleted successfully'});
                    })
                })
                .catch((err) => {
                    logger.error(err)
                    console
                    return response.status(200)
                            .send({success: false, message: 'User deleted successfully, but failed to fetch updated invitation list'});
                })
            }
        })
        .catch((err) => {
            logger.error(err)
            console.log(err)
            return response.status(200)
                .send({success: false, message: 'Failed to delete invitations'});
        })
    }

    static resendInvitation(request, response) {
        const user = new Users(knex)

        user.checkIfUserExist(request.body.email)
        .then((res) => {
            if(res.length > 0) {
                return response.status(200)
                    .send({success: false, message: 'Cannot send invitation, account already registered for this email'});
            } else {
                user.isInvitationSent(request.body.email)
                .then((inviteSent) => {
                    if(inviteSent == 'yes') {
                        user.getInvitationDetail(request.body.email)
                        .then((inviteData) => {
                            if(inviteData && inviteData.status != 'Registered') {
                                user.updateInvitationToken(request.body.email)
                                .then((data) => {
                                    const { res, token } = data
                                    if(res == 1) {
                                        user.getUserDetailsById(inviteData.sender)
                                        .then((_sender) => {
                                            const senderName = _sender.firstname
                            
                                            user.getCompanyDetails(inviteData.company)
                                            .then((companyData) => {
                                                if(companyData) {

                                                    var mailOptions2 = {
                                                        from: '<testpradeep131@gmail.com>',
                                                        to: request.body.email,
                                                        subject: 'Invitation',
                                                        template: 'invitation',
                                                        context:{
                                                            sender: senderName,
                                                            company: companyData.companyName,
                                                            acceptLink: `${process.env.FRONTEND_BASE_URL}/auth/create-account?email=${inviteData.email}&token=${token}`,
                                                            denyLink: `${process.env.FRONTEND_BASE_URL}/auth/decline-invitation?email=${inviteData.email}&token=${token}`
                                                        }
                                                    };
                                    
                                                    transporter.sendMail(mailOptions2, function(error, info){
                                                        if(error){
                                                            logger.error(error.message)
                                                            return response.status(200)
                                                            .send({success: false, message: 'Failed to send invitation email'});;
                                                        }
                                                        
                                                        user.getInvitationList(
                                                            request.body.offset,
                                                            request.body.limit,
                                                            request.body.companyId
                                                        )
                                                        .then((invitationList) => {
                                                            user.getTotalNumberOfPageForInvitationList(request.body.limit, request.body.companyId)
                                                            .then((recordCounts) => {
                                                                const {totalPageNum, noOfRecords} = recordCounts
                                                                return response.status(200)
                                                                    .send({success: true, invitationList, totalPageNum, noOfRecords, message: 'Invitation sent successfully'});
                                                            })
                                                        })
                                                        .catch((err) => {
                                                            logger.error(err)
                                                            console
                                                            return response.status(200)
                                                                    .send({success: false, message: 'Failed to send invitation'});
                                                        })
                                                    });
                                                } else {
                                                    return response.status(200)
                                                            .send({success: false, message: 'Failed to send invitation'});
                                                }
                                            })
                                            .catch((err) => {
                                                logger.error(err)
                                                return response.status(200)
                                                        .send({success: false, message: 'Failed to send invitation'});
                                            })
                                        })
                                        .catch((err) => {
                                            logger.error(err)
                                            return response.status(200)
                                                .send({success: false, message: 'Failed to send invitation'});
                                        })
                                    } else {
                                        return response.status(200)
                                            .send({success: false, message: 'Failed to send invitation'});
                                    }
                                })
                            } else {
                                return response.status(200)
                                    .send({success: false, message: 'Failed to send invitation, invitation already registered'});
                            }
                        })
                    } else {
                        return response.status(200)
                            .send({success: false, message: 'Invitation not found'});
                    }
                })
            }
        })
    }

    static getInvitationData(request, response) {
        const user = new Users(knex) 

        user.getInvitationDetail(request.body.email)
        .then((invitationData) => {
            if(invitationData) {
                const tnow = Date.now()
                const tDiff = tnow - parseInt(invitationData.token_issued)

                if(invitationData.status == 'Pending') {
                    if(tDiff < 43200000) {
                        if(invitationData.token == request.body.token) {
                            return response.status(200)
                            .send({success: true, status: 'valid', invitationData});
                        } else {
                            return response.status(200)
                            .send({success: false, status: 'invalid-token'});
                        }
                    } else {
                        return response.status(200)
                            .send({success: false, status: 'expired'});
                    }
                } else if(invitationData.status == 'Declined') {
                    return response.status(200)
                        .send({success: false, status: 'declined'});
                } else if(invitationData.status == 'Registered') {
                    return response.status(200)
                        .send({success: false, status: 'registered'});
                }
            } else {
                return response.status(200)
                        .send({success: false, status: 'invalid'});
            }
        })
        .catch((err) => {
            return response.status(200)
                        .send({success: false, status: 'invalid'});
        })
    }

    static createAccountForInvitedUser(request, response) {
        const user = new Users(knex) 

        user.getInvitationDetail(request.body.email)
        .then((invitationData) => {
            if(invitationData) {
                const tnow = Date.now()
                const tDiff = tnow - parseInt(invitationData.token_issued)

                if(invitationData.status == 'Pending') {
                    if(tDiff < 43200000) {
                        if(invitationData.token == request.body.token) {
                            user.getCompanyDetails(request.body.companyId)
                            .then((companyData) => {

                                if(companyData) {
                                    user.createNewAccountForInvitedUser(
                                        request.body.firstname,
                                        request.body.lastname,
                                        request.body.email,
                                        request.body.mobileNumber,
                                        request.body.password,
                                        companyData.companytwoFactorAuth,
                                        request.body.companyId,
                                        request.body.role
                                    )
                                    .then((res) => {
                                        const {userId} = res
                                        user.updateInvitationStatusAndUserId('Registered', request.body.email, userId)
                                        .then((res) => {
                                            user.getUserDetailsById(userId)
                                            .then((data) => {
                                                let userData = data
                                                userData = {...userData, ...companyData}

                                                user.getCompanyRole(userData.id)
                                                .then((roleData) => {

                                                    const jwtToken = jwt.sign({
                                                        userId: userData.id,
                                                        firstname: userData.firstname,
                                                        email: userData.email,
                                                        role: roleData.role,
                                                        company: roleData.company
                                                    }, process.env.TOKEN_SECRET, { expiresIn: '30 days' });
                                
                                                    let _auth = {
                                                        auth: {
                                                            api_token: jwtToken
                                                        }
                                                    }

                                                    userData = {...userData, ..._auth, role: roleData.role}

                                                    user.getUserDetailsById(invitationData.sender)
                                                    .then((senderData) => {
                                                        var mailOptions2 = {
                                                            from: '<testpradeep131@gmail.com>',
                                                            to: senderData.email,
                                                            subject: 'Invitation Accepted',
                                                            template: 'invitation_accepted',
                                                            context:{
                                                                name: senderData.firstname,
                                                                email: request.body.email
                                                            }
                                                        };
                                        
                                                        transporter.sendMail(mailOptions2, function(error, info){
                                                            if(error){
                                                                logger.error(error.message)
                                                            }
                                                        });
                                                    })

                                                    return response.status(200)
                                                        .send({ success: true, message: 'Authentication Success', userData, twoFactorAuth: companyData.twoFactorAuth });
                                                })
                                            })
                                            .catch((err) => {
                                                console.log(err)
                                                return response.status(200)
                                                    .send({ success: false, message: 'Account creation failed' })
                                            })
                                        })
                                        .catch((err) => {
                                            console.log(err)
                                            return response.status(200)
                                            .send({ success: false, message: 'Account creation failed' })
                                        })
                                    })
                                    .catch((err) => {
                                        console.log(err)
                                        return response.status(200)
                                        .send({ success: false, message: 'Account creation failed' })
                                    })
                                } else {
                                    return response.status(200)
                                        .send({ success: false, message: 'Account creation failed due to invalid company' })
                                }
                            })
                            .catch((err) => {
                                logger.error(err)
                                return response.status(200)
                                        .send({ success: false, message: 'Account creation failed due to invalid company' })
                            })
                        } else {
                            return response.status(200)
                            .send({success: false, message: 'Invalid token provided'});
                        }
                    } else {
                        return response.status(200)
                            .send({success: false, message: 'Invitation expired'});
                    }
                } else if(invitationData.status == 'Declined') {
                    return response.status(200)
                        .send({success: false, message: 'This invitation have already been declined'});
                } else if(invitationData.status == 'Registered') {
                    return response.status(200)
                        .send({success: false, message: 'Account already registered with this invitation'});
                }
            } else {
                return response.status(200)
                        .send({success: false, message: 'Invalid invitation provided'});
            }
        })
        .catch((err) => {
            return response.status(200)
                        .send({success: false, message: 'Invalid invitation provided'});
        })
    }

    static declineInvitation(request, response) {
        const user = new Users(knex)

        user.getInvitationDetail(request.body.email)
        .then((invitationData) => {
            if(invitationData) {
                const tnow = Date.now()
                const tDiff = tnow - parseInt(invitationData.token_issued)

                if(invitationData.status == 'Pending') {
                    if(tDiff < 600000) {
                        if(invitationData.token == request.body.token) {
                            user.getCompanyDetails(invitationData.company)
                            .then((companyData) => {
                                if(companyData) {
                                    user.declineInvitation(request.body.email)
                                    .then((res) => {
                                        if(res == 1) {
                                            user.getUserDetailsById(invitationData.sender)
                                            .then((senderData) => {
                                                var mailOptions2 = {
                                                    from: '<testpradeep131@gmail.com>',
                                                    to: senderData.email,
                                                    subject: 'Invitation Declined',
                                                    template: 'invitation_declined',
                                                    context:{
                                                        name: senderData.firstname,
                                                        email: request.body.email
                                                    }
                                                };
                                
                                                transporter.sendMail(mailOptions2, function(error, info){
                                                    if(error){
                                                        logger.error(error.message)
                                                    }
                                                });
                                            })
                                            return response.status(200)
                                                .send({ success: true, message: 'Invitation declined' })                               	
                                        } else {
                                            return response.status(200)
                                                .send({ success: true, status: 'failed', message: 'Failed to decline invitation' })
                                        }
                                    })
                                } else {
                                    return response.status(200)
                                        .send({ success: false, status: 'failed', message: 'Failed to decline invitation' })
                                }
                            })
                            .catch((err) => {
                                logger.error(err)
                                return response.status(200)
                                        .send({ success: false, status: 'failed', message: 'Failed to decline invitation' })
                            })
                        } else {
                            return response.status(200)
                            .send({success: false, status: 'invalid-token', message: 'Failed to decline invitation, invalid token provided'});
                        }
                    } else {
                        return response.status(200)
                            .send({success: false, status: 'expired', message: 'Invitation expired'});
                    }
                } else if(invitationData.status == 'Declined') {
                    return response.status(200)
                        .send({success: false, status: 'declined', message: 'This invitation have already been declined'});
                } else if(invitationData.status == 'Registered') {
                    return response.status(200)
                        .send({success: false, status: 'registered', message: 'Account already registered with this invitation'});
                }
            } else {
                return response.status(200)
                        .send({success: false, status: 'invalid', message: 'Invalid invitation provided'});
            }
        })
        .catch((err) => {
            return response.status(200)
                        .send({success: false, status: 'invalid', message: 'Invalid invitation provided'});
        })
    }

    static getUserDetailsForAdmin(request, response) {
        const user = new Users(knex)

        user.getUserDetailsById(request.body.userId)
        .then((userData) => {
            user.getCompanyRole(request.body.userId)
            .then((roleData) => {
                userData = {...userData, role: roleData.role}
                return response.status(200)
                .send({success: true, message: 'User data fetched successfully', userData});
            })
            .catch((err) => {
                userData = {...userData, role: '3'}
                return response.status(200)
                .send({success: true, message: 'User data fetched successfully, but failed to fetch role data', userData});
            })
        })
        .catch((err) => {
            console.log(err)
            return response.status(200)
                .send({success: false, message: 'Failed to fetch user data'});
        })
    }

    static verifyAccountForAdmin(request, response) {
        const user = new Users(knex)

        user.verifyAccount(request.body.userId)
        .then((res) => {
            if(res == 1) {
                return response.status(200)
                    .send({success: true, message: 'Account verification complete'});
            } else {
                return response.status(200)
                    .send({success: false, message: 'Account verification failed'});
            }
        })
        .catch((err) => {
            console.log(err)
            logger.error(err)
            return response.status(200)
                    .send({success: false, message: 'Account verification failed'});
        })
    }

    static enable2FAFordmin(request, response) {
        const user = new Users(knex)

        user.enable2FA(request.body.userId)
        .then((res) => {
            if(res == 1) {
                return response.status(200)
                        .send({success: true, message: 'Two factor authentication enabled'});
            } else {
                return response.status(200)
                        .send({success: false, message: 'Failed to enable two factor authentication'});
            }
        })
        .catch((err) => {
            console.log(err)
            logger.error(err)
            return response.status(200)
                        .send({success: false, message: 'Failed to enable two factor authentication'});
        })
    }

    static disable2FAFordmin(request, response) {
        const user = new Users(knex)

        user.disable2FA(request.body.userId)
        .then((res) => {
            if(res == 1) {
                return response.status(200)
                        .send({success: true, message: 'Two factor authentication disabled'});
            } else {
                return response.status(200)
                        .send({success: false, message: 'Failed to disable two factor authentication'});
            }
        })
        .catch((err) => {
            console.log(err)
            logger.error(err)
            return response.status(200)
                        .send({success: false, message: 'Failed to disable two factor authentication'});
        })
    }

    static userLockAndUnlockOptionForAdmin(request, response) {
        const user = new Users(knex)

        user.userLockAndUnlockOptionForAdmin(request.body.userId, request.body.status)
        .then((res) => {
            if(res == 1) {
                if(request.body.status == '1') {
                    return response.status(200)
                        .send({success: true, message: 'User account locked successfully'});
                } else {
                    return response.status(200)
                        .send({success: true, message: 'User account unlocked successfully'});
                }
            } else {
                return response.status(200)
                        .send({success: false, message: 'Failed to change account status'});
            }
        })
        .catch((err) => {
            console.log(err)
            return response.status(200)
                        .send({success: false, message: 'Failed to change account status'});
        })
    }

    static adminUpdatePasswordOptionForUser(request, response) {
        const user = new Users(knex)

        user.updatePassword(request.body.userId, request.body.newPassword)
        .then((res) => {
            if(res == 1) {
                return response.status(200)
                    .send({success: true, message: 'Password updated successfully for user'});
            } else {
                return response.status(200)
                    .send({success: false, message: 'Failed to update password for user'});
            }
        })
        .catch((err) => {
            console.log(err)
            return response.status(200)
                    .send({success: false, message: 'Failed to update password for user'});
        })
    }

    static whiteListUserAccount(request, response) {
        const user = new Users(knex)

        user.whiteListAccount(request.body.userId)
        .then((res) => {
            if(res == 1) {
                return response.status(200)
                    .send({success: true, message: 'Account whitelisted successfully'});
            } else {
                return response.status(200)
                    .send({success: false, message: 'Failed to whitelist the account'});
            }
        })
        .catch((err) => {
            return response.status(200)
                    .send({success: false, message: 'Failed to whitelist the account'});
        })
    }
    static blackListUserAccount(request, response) {
        const user = new Users(knex)

        user.blackListAccount(request.body.userId)
        .then((res) => {
            if(res == 1) {
                return response.status(200)
                    .send({success: true, message: 'Account blacklisted successfully'});
            } else {
                return response.status(200)
                    .send({success: false, message: 'Failed to blacklist the account'});
            }
        })
        .catch((err) => {
            return response.status(200)
                    .send({success: false, message: 'Failed to blacklist the account'});
        })
    }
}

module.exports = UsersController