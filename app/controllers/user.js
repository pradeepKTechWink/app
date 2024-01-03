var jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Users = require('../services/Users')
const hbs = require('nodemailer-express-handlebars');
const nodemailer = require('nodemailer');
const path = require('path')
const winston = require('winston');
const { emailTransporter } = require('../init/emailTransporter')
const { 
    createCheckoutSessionURLForType1,
    createCheckoutSessionURLForType2,
    createCheckoutSessionURLForType3,
    createCheckoutSessionURLForType4
} = require('../init/stripe')
const { combine, timestamp, json } = winston.format;
dotenv.config();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), json()),
  transports: [
    new winston.transports.File({
      filename: process.env.LOG_FILE_PATH,
    }),
  ],
});

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


class UsersController {

    static createSessionURL(request, response) {
        const user = new Users(knex)
        if(request.body.registrationType == 'nonCompanyRegistration') {
            if(
                request.body.email &&
                request.body.firstname &&
                request.body.lastname &&
                request.body.mobileNumber &&
                request.body.accountType &&
                request.body.password
            ) {
                user.checkIfUserExist(request.body.email)
                .then(async (res) => {
                    if(res.length > 0) {
                        logger.warn(`Account already exists for ${request.body.email}`)
                        return response.status(201)
                            .send({ success: false, message: `${request.body.email} already has an account, try with another email` });
                    } else {
                        try {
                            const sessionURL = await createCheckoutSessionURLForType1(
                                request.body.email,
                                request.body.firstname,
                                request.body.lastname,
                                request.body.mobileNumber,
                                request.body.accountType,
                                request.body.password,
                                request.body.registrationType
                            )
                            return response.status(200)
                                .send({success: true, sessionURL});
                        } catch (error) {
                            logger.warn(`Failed to create checout session URL for ${request.body.email}`)
                            logger.error(error)
                            return response.status(201)
                                .send({success: false, message: "Failed to create checkout session URL"});
                        }
                    }
                })
                .catch((err) => {
                    logger.warn(`Failed to create checout session URL for ${request.body.email}`)
                    logger.error(err)
                    return response.status(201)
                        .send({success: false, message: "Failed to create checkout session URL"});
                })
            } else {
                logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
                return response.status(201)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
            }
        } else if(request.body.registrationType == 'googleNonCompanyRegistration') {
            if(
                request.body.email &&
                request.body.firstname &&
                request.body.lastname &&
                request.body.profilePic &&
                request.body.accountType
            ) {
                user.checkIfUserExist(request.body.email)
                .then(async (res) => {
                    if(res.length > 0) {
                        logger.warn(`Account already exists for ${request.body.email}`)
                        return response.status(201)
                            .send({ success: false, message: `${request.body.email} already has an account, try with another email` });
                    } else {
                        try {
                            const sessionURL = await createCheckoutSessionURLForType2(
                                request.body.email,
                                request.body.firstname,
                                request.body.lastname,
                                request.body.profilePic,
                                request.body.accountType,
                                request.body.registrationType
                            )
                            return response.status(200)
                                .send({success: true, sessionURL});
                        } catch (error) {
                            logger.warn(`Failed to create checout session URL for ${request.body.email}`)
                            logger.error(error)
                            return response.status(201)
                                .send({success: false, message: "Failed to create checkout session URL"});
                        }
                    }
                })
                .catch((err) => {
                    logger.warn(`Failed to create checout session URL for ${request.body.email}`)
                    logger.error(err)
                    return response.status(201)
                        .send({success: false, message: "Failed to create checkout session URL"});
                })
            } else {
                logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
                return response.status(201)
                    .send({ success: false, message: "Missing parameters, fill all the required fields" });
            }
        } else if(request.body.registrationType == 'googleCompanyRegistration') {
            if(
                request.body.firstname &&
                request.body.lastname &&
                request.body.email &&
                request.body.phoneNumber &&
                request.body.companyName &&
                request.body.orgType &&
                request.body.mailingAddStreetName &&
                request.body.mailingAddCityName &&
                request.body.mailingAddStateName &&
                request.body.mailingAddZip &&
                request.body.billingAddStreetName &&
                request.body.billingAddCityName &&
                request.body.billingAddStateName &&
                request.body.billingAddZip &&
                request.body.isMailAndBillAddressSame &&
                request.body.profilePic &&
                request.body.accountType
            ) {
                user.checkIfUserExist(request.body.email)
                .then(async (res) => {
                    if(res.length > 0) {
                        logger.warn(`Account already exists for ${request.body.email}`)
                        return response.status(201)
                            .send({ success: false, message: `${request.body.email} already has an account, try with another email` });
                    } else {
                        try {
                            const sessionURL = await createCheckoutSessionURLForType3(
                                request.body.firstname,
                                request.body.lastname,
                                request.body.email,
                                request.body.phoneNumber,
                                request.body.companyName,
                                request.body.orgType,
                                request.body.mailingAddStreetName,
                                request.body.mailingAddCityName,
                                request.body.mailingAddStateName,
                                request.body.mailingAddZip,
                                request.body.billingAddStreetName,
                                request.body.billingAddCityName,
                                request.body.billingAddStateName,
                                request.body.billingAddZip,
                                request.body.isMailAndBillAddressSame,
                                request.body.profilePic,
                                request.body.accountType,
                                request.body.registrationType
                            )
                            return response.status(200)
                                .send({success: true, sessionURL});
                        } catch (error) {
                            logger.warn(`Failed to create checout session URL for ${request.body.email}`)
                            logger.error(error)
                            return response.status(201)
                                .send({success: false, message: "Failed to create checkout session URL"});
                        }
                    }
                })
                .catch((err) => {
                    logger.warn(`Failed to create checout session URL for ${request.body.email}`)
                    logger.error(err)
                    return response.status(201)
                        .send({success: false, message: "Failed to create checkout session URL"});
                })
            } else {
                logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
                return response.status(201)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
            }
        } else {
            if(
                request.body.email &&
                request.body.firstname &&
                request.body.lastname &&
                request.body.mobileNumber &&
                request.body.accountType &&
                request.body.password &&
                request.body.companyName &&
                request.body.phoneNumber &&
                request.body.orgType &&
                request.body.mailingAddStreetName &&
                request.body.mailingAddCityName &&
                request.body.mailingAddStateName &&
                request.body.mailingAddZip &&
                request.body.billingAddStreetName &&
                request.body.billingAddCityName &&
                request.body.billingAddStateName &&
                request.body.billingAddZip &&
                request.body.isMailAndBillAddressSame
            ) {
                user.checkIfUserExist(request.body.email)
                .then(async (res) => {
                    if(res.length > 0) {
                        logger.warn(`Account already exists for ${request.body.email}`)
                        return response.status(201)
                            .send({ success: false, message: `${request.body.email} already has an account, try with another email` });
                    } else {
                        try {
                            const sessionURL = await createCheckoutSessionURLForType4(
                                request.body.email,
                                request.body.firstname,
                                request.body.lastname,
                                request.body.mobileNumber,
                                request.body.accountType,
                                request.body.password,
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
                                request.body.isMailAndBillAddressSame,
                                request.body.registrationType
                            )
                            return response.status(200)
                                .send({success: true, sessionURL});
                        } catch (error) {
                            logger.warn(`Failed to create checout session URL for ${request.body.email}`)
                            logger.error(error)
                            return response.status(201)
                                .send({success: false, message: "Failed to create checkout session URL"});
                        }
                    }
                })
                .catch((err) => {
                    logger.warn(`Failed to create checout session URL for ${request.body.email}`)
                    logger.error(err)
                    return response.status(201)
                        .send({success: false, message: "Failed to create checkout session URL"});
                })
            } else {
                logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
                return response.status(201)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
            }
        }
    }

    static checkPaymentStatus(request, response) {
        const user = new Users(knex)

        if(request.body.email) {
            user.checkPaymentStatus(request.body.email)
            .then((res) => {
                if(res == 'success') {
                    return response.status(201)
                        .send({success: true, status: 'success'});
                } else if(res == 'failed') {
                    return response.status(201)
                        .send({success: false, status: 'failed'});
                } else {
                    return response.status(201)
                        .send({success: true, status: 'pending'});
                }
            })
            .catch((err) => {
                console.log(err)
                return response.status(201)
                        .send({success: false, status: 'failed'});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(201)
                .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static verifyUser(request, response) {
        const user = new Users(knex)

        if(
            request.body.userId &&
            request.body.token
        ) {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: {...request.body},
                headers: request.headers
            }
            logger.debug(JSON.stringify( debugData ))
            logger.info(`Validating verification token for user ID ${request.body.userId}`)
            user.validateToken(
                request.body.userId,
                request.body.token
            )
            .then((res) => {
                if(res == 'valid') {
                    logger.info(`Verification token is valid for user ID ${request.body.userId}`)
                    logger.info(`Verifying account for user ID ${request.body.userId}`)
                    user.verifyAccount(request.body.userId)
                    .then((res) => {
                        if(res == 1) {
                            logger.info(`Account verification success for ${request.body.userId}`)
                            logger.debug(JSON.stringify( {success: true, message: request.t('accountVerificationSuccess')} ))
                            return response.status(200)
                                .send({success: true, message: request.t('accountVerificationSuccess')});
                        } else {
                            logger.warn(`Account verification failed for ${request.body.userId}`)
                            logger.debug(JSON.stringify( {success: false, message: request.t('accountVerificationFailed')} ))
                            return response.status(200)
                                .send({success: false, message: request.t('accountVerificationFailed')});
                        }
                    })
                    .catch((err) => {
                        logger.warn(`Account verification failed for ${request.body.userId}`)
                        logger.error(err)
                        logger.debug(JSON.stringify( {success: false, message: request.t('accountVerificationFailed')} ))
                        return response.status(200)
                                .send({success: false, message: request.t('accountVerificationFailed')});
                    })
                } else if(res == 'expired') {
                    logger.warn(`Verification token expired for user ID ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('verifyLinkExpired')} ))
                    return response.status(200)
                                .send({success: false, message: request.t('verifyLinkExpired')});
                } else {
                    logger.warn(`Verification token invalid for user ID ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('verifyLinkInvalid')} ))
                    return response.status(200)
                                .send({success: false, message: request.t('verifyLinkInvalid')});
                }
            })
            .catch((err) => {
                logger.warn(`Token verification failed for ${request.body.userId}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('accountVerificationFailed')} ))
                return response.status(200)
                                .send({success: false, message: request.t('accountVerificationFailed')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static resendVerificationMail(request, response) {
        const user = new Users(knex)

        if(request.body.userId) {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: {...request.body},
                headers: request.headers
            }
            logger.debug(JSON.stringify( debugData ))
            logger.info(`Resending verification link for ${request.body.userId}`)
            logger.info(`Resetting verification token for ${request.body.userId}`)
            user.resetToken(request.body.userId)
            .then((result) => {
                const { res, token } = result
                if(res == 1) {
                    logger.info(`Token reset success for ${request.body.userId}`)
                    logger.info(`Fetching user information for ${request.body.userId}`)
                    user.getUserDetailsById(request.body.userId)
                    .then(async (user) => {
                        var { transporter, mailingAddress } = await emailTransporter()
                        var mailOptions = {
                            from: mailingAddress,
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
                                logger.warn(`Failed to resend verification email for ${request.body.userId}`)
                                logger.error(error.message)
                                logger.debug(JSON.stringify( {success: false, message: request.t('verifyLinkSendFailed')} ))
                                return response.status(200)
                                .send({success: false, message: request.t('verifyLinkSendFailed')});
                            }
                            logger.info(`Verification email resent successfully for ${request.body.userId}`)
        
                            logger.debug(JSON.stringify( {success: true, message: request.t('verifyLinkSendSuccess')} ))
                            return response.status(200)
                                .send({success: true, message: request.t('verifyLinkSendSuccess')});
                        });
                    })
                } else {
                    logger.warn(`Token reset failed for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('verifyLinkSendFailed')} ))
                    return response.status(200)
                            .send({success: false, message: request.t('verifyLinkSendFailed')});
                }
            })
            .catch((err) => {
                logger.warn(`Token reset failed for ${request.body.userId}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('verifyLinkSendFailed')} ))
                return response.status(200)
                .send({success: false, message: request.t('verifyLinkSendFailed')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static validateGoogleLoginCredentials(request, response) {
        const user = new Users(knex)

        if (
            request.body.email
        ) {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: { ...request.body, password: '*********' },
                headers: request.headers
            }
            logger.debug(JSON.stringify(debugData))

            logger.info(`Validating login credential for ${request.body.email}`)
            console.log(request.body.password)
            user.validateGoogleLoginCredential(request.body.email)
                .then((res) => {
                    if (res.stat == 'valid') {
                        logger.info(`Valid credentials provided by ${request.body.email}`)
                        user.getUserDetails(request.body.email)
                            .then((data) => {
                                let userData = data
                                logger.info(`Checking if account is blocked for ${request.body.email}`)
                                if (!userData.accountBlocked) {
                                    logger.info(`Account not in block status`)
                                    logger.info(`Checking if 2FA is enabled for ${request.body.email}`)
                                    user.is2FAEnabled(userData.id)
                                        .then((res) => {
                                            if (res == 'disabled') {
                                                logger.info(`2FA is disabled for ${request.body.email}`)
                                                logger.info(`Initiating authentication for ${request.body.email}`)
                                                user.getAccountType(userData.id)
                                                    .then((type) => {
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

                                                                    userData = { ...userData, ...companyData, ..._auth, role: roleData.role, accountType: type }
                                                                    logger.info(`Authentication success for ${request.body.email}`)
                                                                    logger.debug(JSON.stringify({ success: true, message: request.t('Authentication Success'), userData, twoFactorAuth: false }))
                                                                    return response.status(200)
                                                                        .send({ success: true, message: request.t('Authentication Success'), userData, twoFactorAuth: false });
                                                                })
                                                        })
                                                    })
                                                    .catch((err) => {
                                                        logger.warn(`Authentication failed for ${request.body.email}`)
                                                        logger.error(err)
                                                        logger.debug(JSON.stringify({ success: false, message: request.t('loginFailed') }))
                                                        return response.status(200)
                                                            .send({ success: false, message: request.t('loginFailed') });
                                                    })

                                            } else {
                                                logger.info(`2FA is enabled for ${request.body.email}`)
                                                logger.info(`Sending OTP to ${request.body.email}`)
                                                let userId = userData.id

                                                user.generateOTP(userId)
                                                    .then(async (otp) => {
                                                        var { transporter, mailingAddress } = await emailTransporter()
                                                        var mailOptions = {
                                                            from: mailingAddress,
                                                            to: request.body.email,
                                                            subject: 'Login OTP',
                                                            template: 'otp',
                                                            context: {
                                                                otp: otp
                                                            }
                                                        };

                                                        transporter.sendMail(mailOptions, function (error, info) {
                                                            if (error) {
                                                                logger.warn(`Failed to send OTP for ${request.body.email}`)
                                                                logger.error(error.message)
                                                                return console.log(error);
                                                            }
                                                            logger.info(`OTP sent successfully for ${request.body.email}`)
                                                        });

                                                        logger.debug(JSON.stringify({ success: true, message: 'Valid credential', twoFactorAuth: true }))
                                                        return response.status(200)
                                                            .send({ success: true, message: 'Valid credential', twoFactorAuth: true });
                                                    })
                                                    .catch((err) => {
                                                        logger.warn(`Failed to send OTP for ${request.body.email}`)
                                                        logger.error(err)
                                                        logger.debug(JSON.stringify({ success: false, message: request.t('invalidCredential') }))
                                                        return response.status(200)
                                                            .send({ success: false, message: request.t('invalidCredential') });
                                                    })
                                            }
                                        })
                                } else {
                                    logger.warn(`Authentication failed, account marked for deletion for ${request.body.email}`)
                                    logger.debug(JSON.stringify({ success: false, message: request.t('accountDeleted') }))
                                    return response.status(200)
                                        .send({ success: false, message: request.t('accountDeleted') });
                                }
                            })

                    } else if (res.stat == 'locked') {
                        logger.warn(`Authentication failed, account locked for ${request.body.email}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('accountLocked') }))
                        return response.status(200)
                            .send({ success: false, message: request.t('accountLocked') });
                    } else {
                        logger.warn(`Authentication failed, invalid credential provided by ${request.body.email}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('invalidCredential') }))
                        return response.status(200)
                            .send({ success: false, message: request.t('invalidCredential') });
                    }
                })
                .catch((err) => {
                    logger.warn(`Authentication failed for ${request.body.email}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('loginFailed') }))
                    return response.status(200)
                        .send({ success: false, message: request.t('loginFailed') });
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static validateGoogleOTPAndAuthenticateUser(request, response) {
        const user = new Users(knex)

        if (
            request.body.email &&
            request.body.otp
        ) {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: { ...request.body, password: '*********' },
                headers: request.headers
            }
            logger.debug(JSON.stringify(debugData))
            logger.info(`Validating OTP sent by ${request.body.email}`)
            user.validateGoogleCredentialAndOtp(
                request.body.email,
                request.body.otp
            )
                .then((res) => {
                    if (res == 'valid') {
                        logger.info(`Valid credentials provided by ${request.body.email}`)
                        user.getUserDetails(request.body.email)
                            .then((data) => {
                                let userData = data
                                logger.info(`Checking if account is blocked for ${request.body.email}`)
                                if (!userData.accountBlocked) {
                                    logger.info(`Account not in block status`)
                                    logger.info(`Initiating authentication for ${request.body.email}`)
                                    user.getAccountType(userData.id)
                                        .then((type) => {
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

                                                            userData = { ...userData, ...companyData, ..._auth, role: roleData.role, accountType: type }
                                                            logger.info(`Authentication success for ${request.body.email}`)
                                                            logger.debug(JSON.stringify({ success: true, message: 'Authentication Success', userData, twoFactorAuth: true }))
                                                            return response.status(200)
                                                                .send({ success: true, message: 'Authentication Success', userData, twoFactorAuth: true });
                                                        })
                                                })
                                        })
                                        .catch((err) => {
                                            logger.warn(`Authentication failed for ${request.body.email}`)
                                            logger.error(err)
                                            logger.debug(JSON.stringify({ success: false, message: request.t('loginFailed') }))
                                            return response.status(200)
                                                .send({ success: false, message: request.t('loginFailed') });
                                        })
                                } else {
                                    logger.warn(`Authentication failed, account marked for deletion for ${request.body.email}`)
                                    logger.debug(JSON.stringify({ success: false, message: request.t('accountDeleted') }))
                                    return response.status(200)
                                        .send({ success: false, message: request.t('accountDeleted') });
                                }
                            })
                    } else if (res == 'expired') {
                        logger.warn(`OTP expired for ${request.body.email}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('OTPExpired') }))
                        return response.status(201)
                            .send({ success: false, message: request.t('OTPExpired') });
                    } else if (res == 'Invalid OTP') {
                        logger.warn(`Invalid OTP provided by ${request.body.email}`)
                        user.getUserDetails(request.body.email)
                            .then(async (data) => {
                                let userData = data

                                var { transporter, mailingAddress } = await emailTransporter()
                                var mailOptions = {
                                    from: mailingAddress,
                                    to: userData.email,
                                    subject: 'App Security',
                                    template: 'account_locked',
                                    context: {
                                        name: userData.firstname
                                    }
                                };

                                transporter.sendMail(mailOptions, function (error, info) {
                                    if (error) {
                                        logger.error(error.message)
                                        return console.log(error);
                                    }
                                    console.log('Message sent: ' + info.response);
                                });
                                logger.debug(JSON.stringify({ success: false, message: request.t('invalidOTP') }))
                                return response.status(201)
                                    .send({ success: false, message: request.t('invalidOTP') });
                            })
                    } else if (res == 'locked') {
                        logger.warn(`Account locked due to multiple incorrect OTP attempt for ${request.body.email}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('accountLocked') }))
                        return response.status(201)
                            .send({ success: false, message: request.t('accountLocked') });
                    } else {
                        logger.warn(`Authentication failed, invalid credential provided by ${request.body.email}`)
                        logger.debug(JSON.stringify({ success: false, message: request.t('invalidCredential') }))
                        return response.status(201)
                            .send({ success: false, message: request.t('invalidCredential') });
                    }
                })
        } else {
            logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
            return response.status(400)
                .send({ success: false, message: "Missing parameters, fill all the required fields" });
        }
    }

    static validateLoginCredentials(request, response) {
        const user = new Users(knex)

        if(
            request.body.email &&
            request.body.password
        ) {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: {...request.body, password: '*********'},
                headers: request.headers
            }
            logger.debug(JSON.stringify( debugData ))
    
            logger.info(`Validating login credential for ${request.body.email}`)
            console.log(request.body.password)
            user.validateLoginCredential(request.body.email, request.body.password)
            .then((res) => {
                if(res.stat == 'valid') {
                    logger.info(`Valid credentials provided by ${request.body.email}`)
                    user.getUserDetails(request.body.email)
                    .then((data) => {
                        let userData = data
                        logger.info(`Checking if account is blocked for ${request.body.email}`)
                        if(!userData.accountBlocked) {
                            logger.info(`Account not in block status`)
                            logger.info(`Checking if 2FA is enabled for ${request.body.email}`)
                            user.is2FAEnabled(userData.id)
                            .then((res) => {
                                if(res == 'disabled') {
                                    logger.info(`2FA is disabled for ${request.body.email}`)
                                    user.getAccountType(userData.id)
                                    .then((type) => {
                                        logger.info(`Initiating authentication for ${request.body.email}`)
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
        
                                                userData = {...userData, ...companyData, ..._auth, role: roleData.role, accountType: type}
                                                logger.info(`Authentication success for ${request.body.email}`)
                                                logger.debug(JSON.stringify( { success: true, message: request.t('Authentication Success'), userData, twoFactorAuth: false } ))
                                                return response.status(200)
                                                .send({ success: true, message: request.t('Authentication Success'), userData, twoFactorAuth: false });
                                            })
                                        })
                                        .catch((err) => {
                                            logger.warn(`Authentication failed for ${request.body.email}`)
                                            logger.error(err)
                                            logger.debug(JSON.stringify( {success: false, message: request.t('loginFailed')} ))
                                            return response.status(200)
                                                    .send({success: false, message: request.t('loginFailed')});
                                        })
                                    })
                                    .catch((err) => {

                                    })
                                    
                                } else {
                                    logger.info(`2FA is enabled for ${request.body.email}`)
                                    logger.info(`Sending OTP to ${request.body.email}`)
                                    let userId = userData.id
    
                                    user.generateOTP(userId)
                                    .then(async (otp) => {
                                        var { transporter, mailingAddress } = await emailTransporter()
                                        var mailOptions = {
                                            from: mailingAddress,
                                            to: request.body.email,
                                            subject: 'Login OTP',
                                            template: 'otp',
                                            context:{
                                                otp: otp
                                            }
                                        };
                        
                                        transporter.sendMail(mailOptions, function(error, info){
                                            if(error){
                                                logger.warn(`Failed to send OTP for ${request.body.email}`)
                                                logger.error(error.message)
                                                return console.log(error);
                                            }
                                            logger.info(`OTP sent successfully for ${request.body.email}`)
                                        });
                        
                                        logger.debug(JSON.stringify( {success: true, message: 'Valid credential', twoFactorAuth: true} ))
                                        return response.status(200)
                                            .send({success: true, message: 'Valid credential', twoFactorAuth: true});
                                    })
                                    .catch((err) => {
                                        logger.warn(`Failed to send OTP for ${request.body.email}`)
                                        logger.error(err)
                                        logger.debug(JSON.stringify( {success: false, message: request.t('invalidCredential')} ))
                                        return response.status(200)
                                            .send({success: false, message: request.t('invalidCredential')});
                                    })
                                }
                            })
                        } else {
                            logger.warn(`Authentication failed, account marked for deletion for ${request.body.email}`)
                            logger.debug(JSON.stringify( {success: false, message: request.t('accountDeleted')} ))
                            return response.status(200)
                            .send({success: false, message: request.t('accountDeleted')});
                        }
                    })
                    
                } else if(res.stat == 'locked') {
                    logger.warn(`Authentication failed, account locked for ${request.body.email}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('accountLocked')} ))
                    return response.status(200)
                        .send({success: false, message: request.t('accountLocked')});
                } else {
                    logger.warn(`Authentication failed, invalid credential provided by ${request.body.email}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('invalidCredential')} ))
                    return response.status(200)
                        .send({success: false, message: request.t('invalidCredential')});
                }
            })
            .catch((err) => {
                logger.warn(`Authentication failed for ${request.body.email}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('loginFailed')} ))
                return response.status(200)
                        .send({success: false, message: request.t('loginFailed')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static validateOTPAndAuthenticateUser(request, response) {
        const user = new Users(knex)

        if(
            request.body.email &&
            request.body.password &&
            request.body.otp
        ) {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: {...request.body, password: '*********'},
                headers: request.headers
            }
            logger.debug(JSON.stringify( debugData ))
            logger.info(`Validating OTP sent by ${request.body.email}`)
            user.validateCredentialAndOtp(
                request.body.email,
                request.body.password,
                request.body.otp
            )
            .then((res) => {
                if(res == 'valid') {
                    logger.info(`Valid credentials provided by ${request.body.email}`)
                    user.getUserDetails(request.body.email)
                    .then((data) => {
                        let userData = data
                        logger.info(`Checking if account is blocked for ${request.body.email}`)
                        if(!userData.accountBlocked) {
                            logger.info(`Account not in block status`)
                            logger.info(`Initiating authentication for ${request.body.email}`)
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
                                    logger.info(`Authentication success for ${request.body.email}`)
                                    logger.debug(JSON.stringify( { success: true, message: 'Authentication Success', userData, twoFactorAuth: true } ))
                                    return response.status(200)
                                    .send({ success: true, message: 'Authentication Success', userData, twoFactorAuth: true });
                                })
                            })
                            .catch((err) => {
                                logger.warn(`Authentication failed for ${request.body.email}`)
                                logger.error(err)
                                logger.debug(JSON.stringify( {success: false, message: request.t('loginFailed')} ))
                                return response.status(200)
                                        .send({success: false, message: request.t('loginFailed')});
                            })
                        } else {
                            logger.warn(`Authentication failed, account marked for deletion for ${request.body.email}`)
                            logger.debug(JSON.stringify( {success: false, message: request.t('accountDeleted')} ))
                            return response.status(200)
                                .send({success: false, message: request.t('accountDeleted')});
                        }
                    })
                } else if( res == 'expired') {
                    logger.warn(`OTP expired for ${request.body.email}`)
                    logger.debug(JSON.stringify( { success: false, message: request.t('OTPExpired') } ))
                    return response.status(201)
                            .send({ success: false, message: request.t('OTPExpired') });
                } else if(res == 'Invalid OTP') {
                    logger.warn(`Invalid OTP provided by ${request.body.email}`)
                    user.getUserDetails(request.body.email)
                    .then(async (data) => {
                        let userData = data
    
                        var { transporter, mailingAddress } = await emailTransporter()
                        var mailOptions = {
                            from: mailingAddress,
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
                        logger.debug(JSON.stringify( { success: false, message: request.t('invalidOTP') } ))
                        return response.status(201)
                            .send({ success: false, message: request.t('invalidOTP') });
                    })
                } else if(res == 'locked') {
                    logger.warn(`Account locked due to multiple incorrect OTP attempt for ${request.body.email}`)
                    logger.debug(JSON.stringify( { success: false, message: request.t('accountLocked') } ))
                    return response.status(201)
                            .send({ success: false, message: request.t('accountLocked') });
                } else {
                    logger.warn(`Authentication failed, invalid credential provided by ${request.body.email}`)
                    logger.debug(JSON.stringify( { success: false, message: request.t('invalidCredential') } ))
                    return response.status(201)
                            .send({ success: false, message: request.t('invalidCredential') });
                }
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static sendResetPasswordLink(request, response) {
        const user = new Users(knex)

        if(request.body.email) {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: {...request.body},
                headers: request.headers
            }
            logger.debug(JSON.stringify( debugData ))
            logger.info(`Sending password reset link for ${request.body.email}`)
            logger.info(`Checking if account exists for ${request.body.email}`)
            user.checkIfUserExist(request.body.email)
            .then((res) => {
                if(res.length > 0) {
                    logger.warn(`Account exists for ${request.body.email}`)
                    user.getUserDetails(request.body.email)
                    .then((data) => {
                        const userData = data
    
                        user.resetToken(userData.id)
                        .then(async (result) => {
                            const { res, token } = result
                            if(res == 1) {
                                var { transporter, mailingAddress } = await emailTransporter()
                                var mailOptions = {
                                    from: mailingAddress,
                                    to: userData.email,
                                    subject: 'Reset Password',
                                    template: 'password_reset',
                                    context:{
                                        name: userData.firstname,
                                        link: `${process.env.FRONTEND_BASE_URL}/auth/reset-password?email=${request.body.email}&token=${token}`,
                                        token
                                    }
                                };
                
                                transporter.sendMail(mailOptions, function(error, info){
                                    if(error){
                                        logger.warn(`Failed send password reset email for ${request.body.email}`);
                                        logger.error(error.message)
                                        logger.debug(JSON.stringify( {success: false, message: request.t('resetPassLinkSendFailed')} ))
                                        return response.status(200)
                                        .send({success: false, message: request.t('resetPassLinkSendFailed')});
                                    }
                                    logger.info(`Password reset email sent successfully for ${request.body.email}`)
                
                                    logger.debug(JSON.stringify( {success: true, message: request.t('resetPassLinkSendSuccess')} ))
                                    return response.status(200)
                                        .send({success: true, message: request.t('resetPassLinkSendSuccess')});
                                });
                            } else {
                                logger.warn(`Failed to send password reset email for ${request.body.email}`)
                                logger.debug(JSON.stringify( {success: false, message: request.t('resetPassLinkSendFailed')} ))
                                return response.status(200)
                                    .send({success: false, message: request.t('resetPassLinkSendFailed')});
                            }
                        })
                        .catch((err) => {
                            logger.warn(`Failed to send password reset email for ${request.body.email}`)
                            logger.error(err)
                            logger.debug(JSON.stringify( {success: false, message: request.t('resetPassLinkSendFailed')} ))
                            return response.status(200)
                            .send({success: false, message: request.t('resetPassLinkSendFailed')});
                        })
                    })
                } else {
                    logger.warn(`Cannot find account registered under ${request.body.email}`)
                    logger.debug(JSON.stringify( {success: false, message: `${request.body.email} ${request.t('emailNotExist')}`} ))
                    return response.status(200)
                        .send({success: false, message: `${request.body.email} ${request.t('emailNotExist')}`});
                }
            })
            .catch((err) => {
                logger.warn(`Failed to send password reset email for ${request.body.email}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('resetPassLinkSendFailed')} ))
                return response.status(200)
                    .send({success: false, message: request.t('resetPassLinkSendFailed')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static changePassword(request, response) {
        const user = new Users(knex)

        if(
            request.body.email &&
            request.body.token &&
            request.body.password
        ) {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: {...request.body, password: '**********'},
                headers: request.headers
            }
            logger.debug(JSON.stringify( debugData ))
            logger.info(`Initiating password change for ${request.body.email}`)
            logger.info(`Validating password reset token for ${request.body.email}`)
    
            user.getUserDetails(request.body.email)
            .then((userData) => {
                const userId = userData.id
    
                user.validateToken(
                    userId,
                    request.body.token
                ).then((res) => {
                    if(res == 'valid') {
                        logger.info(`Valid token provided by ${request.body.email}`)
                        user.updatePassword(userId, request.body.password)
                        .then((res) => {
                            if(res == 1) {
                                logger.info(`Password update successful for ${request.body.email}`)
                                logger.debug(JSON.stringify( {success: true, message: request.t('passChangeSuccess')} ))
                                return response.status(200)
                                    .send({success: true, message: request.t('passChangeSuccess')});
                            } else {
                                logger.warn(`Password update failed for ${request.body.email}`)
                                logger.debug(JSON.stringify( {success: false, message: request.t('passChangeFailed')} ))
                                return response.status(200)
                                    .send({success: false, message: request.t('passChangeFailed')});
                            }
                        })
                    } else if(res == 'invalid token') {
                        logger.warn(`Invalid token provided by ${request.body.email}`)
                        logger.debug(JSON.stringify( {success: false, message: request.t('resetPassLinkInvalid')} ))
                        return response.status(200)
                            .send({success: false, message: request.t('resetPassLinkInvalid')});
                    } else if(res == 'expired') {
                        logger.warn(`Expired token provided by ${request.body.email}`)
                        logger.debug(JSON.stringify( {success: false, message: request.t('resetPassLinkExpired')} ))
                        return response.status(200)
                                    .send({success: false, message: request.t('resetPassLinkExpired')});
                    }
                })
                .catch((err) => {
                    logger.warn(`Password change failed for ${request.body.email}`)
                    logger.error(err)
                    logger.debug(JSON.stringify( {success: false, message: request.t('passChangeFailed')} ))
                    return response.status(200)
                                    .send({success: false, message: request.t('passChangeFailed')});
                })
            })
            .catch((err) => {
                logger.warn(`Password change failed for ${request.body.email}`)
                logger.error(err)
                console.log(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('passChangeFailed')} ))
                return response.status(200)
                                    .send({success: false, message: request.t('passChangeFailed')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static changeCurrentPassword(request, response) {
        const user = new Users(knex)

        if(
            request.body.userId &&
            request.body.newPassword &&
            request.body.currentPassword
        ) {
            logger.info(`Initiating password change for user ID ${request.body.userId}`)
            logger.info(`Validating current password for user ID ${request.body.userId}`)
            user.validatePasswordByUserId(request.body.userId, request.body.currentPassword)
            .then((res) => {
                if(res == 'valid') {
                    logger.info(`Valid password provided by user ID ${request.body.userId}`)
                    user.updatePassword(request.body.userId, request.body.newPassword)
                    .then((res) => {
                        if(res == 1) {
                            logger.info(`Password update successful for user ID ${request.body.userId}`)
                            logger.debug(JSON.stringify( {success: true, message: request.t('passwordUpdateSuccess')} ))
                            return response.status(200)
                                .send({success: true, message: request.t('passwordUpdateSuccess')});
                        } else {
                            logger.warn(`Password update failed for user ID ${request.body.userId}`)
                            logger.debug(JSON.stringify( {success: false, message: request.t('passwordUpdateFailed') } ))
                            return response.status(200)
                                .send({success: false, message: request.t('passwordUpdateFailed') });
                        }
                    })
                } else {
                    logger.warn(`Invalid password provided by user ID ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('invalidPassword')} ))
                    return response.status(200)
                                .send({success: false, message: request.t('invalidPassword')});
                }
            })
            .catch((err) => {
                logger.warn(`Password update failed for user ID ${request.body.userId}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('passwordUpdateFailed') } ))
                return response.status(200)
                                .send({success: false, message: request.t('passwordUpdateFailed') });
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static updateEmail(request, response) {
        const user = new Users(knex)

        if(
            request.body.userId &&
            request.body.password &&
            request.body.newEmail
        ) {
            logger.info(`Updating email for user ID ${request.body.userId}`)
            user.isUpdatingSameEmail(request.body.userId, request.body.newEmail)
            .then((isSameEmail) => {
                if(isSameEmail == 'no') {
                    user.validatePasswordByUserId(request.body.userId, request.body.password)
                    .then((res) => {
                        if(res == 'valid') {
                            user.updateEmail(request.body.userId, request.body.newEmail)
                            .then((res) => {
                                if(res == 1) {
                                    logger.info(`Email update success for user ID ${request.body.userId}`)
                                    user.resetToken(request.body.userId)
                                    .then(async (result) => {
                                        const { res, token } = result
                                        if(res == 1) {
                                            await user.updateUserMeta(request.body.userId, '2FA', 0)
                                            user.getUserDetailsById(request.body.userId)
                                            .then(async (user) => {
                                                var { transporter, mailingAddress } = await emailTransporter()
                                                var mailOptions = {
                                                    from: mailingAddress,
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
                                                        logger.warn(`Failed to send email verification to ${request.body.newEmail}`);
                                                        logger.error(error.message)
                                                        logger.debug(JSON.stringify( {success: false, message: request.t('verifyLinkSendFailed')} ))
                                                        return response.status(200)
                                                        .send({success: false, message: request.t('verifyLinkSendFailed')});
                                                    }
                                                    logger.info(`Email verification sent to ${request.body.newEmail}`)
                                
                                                    logger.debug(JSON.stringify( {
                                                        success: true, 
                                                        message: request.t('emailUpdateSuccess'), 
                                                        email: request.body.newEmail,
                                                        accountStatus: false
                                                    } ))
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
                                            logger.warn(`Email update failed for ${request.body.newEmail}`)
                                            logger.debug(JSON.stringify( {success: false, message: request.t('emailUpdateFailed')} ))
                                            return response.status(200)
                                                    .send({success: false, message: request.t('emailUpdateFailed')});
                                        }
                                    })
                                    .catch((err) => {
                                        logger.warn(`Email update failed for ${request.body.newEmail}`)
                                        logger.error(err)
                                        logger.debug(JSON.stringify( {success: false, message: request.t('emailUpdateFailed')} ))
                                        return response.status(200)
                                        .send({success: false, message: request.t('emailUpdateFailed')});
                                    })
                                }
                            })
                        } else {
                            logger.warn(`Email update failed due to invalid password provided by ${request.body.newEmail}`)
                            logger.debug(JSON.stringify( {success: false, message: request.t('invalidPassword')} ))
                            return response.status(200)
                                        .send({success: false, message: request.t('invalidPassword')});
                        }
                    })
                    .catch((err) => {
                        logger.warn(`Email update failed for ${request.body.newEmail}`)
                        logger.error(err)
                        logger.debug(JSON.stringify( {success: false, message: request.t('emailUpdateFailed')} ))
                        return response.status(200)
                                        .send({success: false, message: request.t('emailUpdateFailed')});
                    })
                } else {
                    logger.warn(`Email update failed, current email and new email are same`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('sameEmail')} ))
                    return response.status(200)
                        .send({success: false, message: request.t('sameEmail')});
                }
            })
            .catch((err) => {
                logger.warn(`Email update failed for ${request.body.newEmail}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('emailUpdateFailed')} ))
                return response.status(200)
                    .send({success: false, message: request.t('emailUpdateFailed')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static enableTwoFactorAuth(request, response) {
        const user = new Users(knex)

        if(request.body.userId) {
            logger.info(`Enabling 2FA for ${request.body.userId}`)
            user.enable2FA(request.body.userId)
            .then((res) => {
                if(res == 1) {
                    logger.info(`2FA enabled for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: true, message: request.t('2FAEnableSuccess')} ))
                    return response.status(200)
                            .send({success: true, message: request.t('2FAEnableSuccess')});
                } else {
                    logger.warn(`Failed to enable 2FA for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('2FAEnableFailed') } ))
                    return response.status(200)
                            .send({success: false, message: request.t('2FAEnableFailed') });
                }
            })
            .catch((err) => {
                logger.warn(`Failed to enable 2FA for ${request.body.userId}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('2FAEnableFailed') } ))
                return response.status(200)
                            .send({success: false, message: request.t('2FAEnableFailed') });
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static disableTwoFactorAuth(request, response) {
        const user = new Users(knex)

        if(request.body.userId) {
            logger.info(`Disabling 2FA for ${request.body.userId}`)
            user.disable2FA(request.body.userId)
            .then((res) => {
                if(res == 1) {
                    logger.info(`2FA disabled for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: true, message: request.t('2FADisableSuccess')} ))
                    return response.status(200)
                            .send({success: true, message: request.t('2FADisableSuccess')});
                } else {
                    logger.warn(`Failed to disable 2FA for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('2FADisableFailed')} ))
                    return response.status(200)
                            .send({success: false, message: request.t('2FADisableFailed')});
                }
            })
            .catch((err) => {
                logger.warn(`Failed to disable 2FA for ${request.body.userId}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('2FADisableFailed')} ))
                return response.status(200)
                            .send({success: false, message: request.t('2FADisableFailed')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static enableCompanyTwoFactorAuth(request, response) {
        const user = new Users(knex)

        if(request.body.companyId && request.body.userId) {
            logger.info(`Enabling company 2FA for ${request.body.companyId}`)
            logger.warn(`Failed to enable company 2FA for ${request.body.companyId}`)
            user.enableCompany2FA(request.body.companyId, request.body.userId)
            .then((res) => {
                if(res == 1) {
                    logger.info(`Company 2FA enabled for ${request.body.companyId}`)
                    logger.info(`Enabling 2FA for company users`)
                    user.enable2FAForAllCompanyUsers(request.body.companyId)
                    .then((res) => {
                        if(res == 1) {
                            logger.info(`2FA enabled for all company users`)
                            logger.debug(JSON.stringify( {success: true, message: request.t('company2FAEnableSuccess')} ))
                            return response.status(200)
                                .send({success: true, message: request.t('company2FAEnableSuccess')});
                        } else {
                            logger.warn(`Failed to enable 2FA for company users`)
                            logger.debug(JSON.stringify( {success: false, message: request.t('company2FAEnableSuccessUsers2FAFailed')} ))
                            return response.status(200)
                            .send({success: false, message: request.t('company2FAEnableSuccessUsers2FAFailed')});
                        }
                    })
                } else {
                    logger.warn(`Failed to enable 2FA for company Id ${request.body.companyId}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('company2FAEnableFailed')} ))
                    return response.status(200)
                            .send({success: false, message: request.t('company2FAEnableFailed')});
                }
            })
            .catch((err) => {
                logger.warn(`Failed to enable 2FA for company Id ${request.body.companyId}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('company2FAEnableFailed')} ))
                return response.status(200)
                            .send({success: false, message: request.t('company2FAEnableFailed')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static disableCompanyTwoFactorAuth(request, response) {
        const user = new Users(knex)

        if(request.body.companyId) {
            logger.info(`Disabling company 2FA for ${request.body.companyId}`)
            logger.warn(`Failed to disable company 2FA for ${request.body.companyId}`)
            user.disableCompany2FA(request.body.companyId)
            .then((res) => {
                if(res == 1) {
                    logger.info(`Company 2FA disabled for ${request.body.companyId}`)
                    logger.info(`Disabling 2FA for company users`)
                    user.disable2FAForAllCompanyUsers(request.body.companyId)
                    .then((res) => {
                        if(res == 1) {
                            logger.info(`2FA disabled for all company users`)
                            logger.debug(JSON.stringify( {success: true, message: request.t('company2FADisableSuccess')} ))
                            return response.status(200)
                                .send({success: true, message: request.t('company2FADisableSuccess')});
                        } else {
                            logger.warn(`Failed to disable 2FA for company users`)
                            logger.debug(JSON.stringify( {success: false, message: request.t('company2FADisableSuccessUsers2FAFailed')} ))
                            return response.status(200)
                            .send({success: false, message: request.t('company2FADisableSuccessUsers2FAFailed')});
                        }
                    })
                } else {
                    logger.warn(`Failed to disable 2FA for company Id ${request.body.companyId}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('company2FADisableFailed')} ))
                    return response.status(200)
                            .send({success: false, message: request.t('company2FADisableFailed')});
                }
            })
            .catch((err) => {
                logger.warn(`Failed to disable 2FA for company Id ${request.body.companyId}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('company2FADisableFailed')} ))
                return response.status(200)
                            .send({success: false, message: request.t('company2FADisableFailed')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static getAccountStatictic(request, response) {
        const user = new Users(knex)

        logger.info(`Fetching account statistics for user ID ${request.body.userId}`)
        user.getAccountStatistic(request.body.userId)
        .then((statData) => {
            if(statData) {
                logger.info(`Account stat fetched successfully for user ID ${request.body.userId}`)
                return response.status(200)
                        .send({success: true, message: request.t('accountStatFetchSuccess'), statData});
            } else {
                logger.warn(`Failed to fetch account stat for user ID ${request.body.userId}`)
                return response.status(200)
                        .send({success: false, message: request.t('accountStatFetchFailed')});
            }
        })
        .catch((err) => {
            logger.warn(`Failed to fetch account stat for user ID ${request.body.userId}`)
            logger.error(err)
            return response.status(200)
                        .send({success: false, message: request.t('accountStatFetchFailed')});
        })
    }

    static sendInvitation(request, response) {
        const user = new Users(knex)

        if(
            request.body.email &&
            request.body.senderId &&
            request.body.role &&
            request.body.companyId
        ) {
            logger.info(`Sending invitation to ${request.body.email}`)
            logger.info(`Checking if account registered under ${request.body.email}`)
            user.checkIfUserExist(request.body.email)
            .then((res) => {
                if(res.length > 0) {
                    logger.info(`Account exist under ${request.body.email}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('invtiationAlreadyExist')} ))
                    return response
                    .send({success: false, message: request.t('invtiationAlreadyExist')});
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
                                    .then(async (companyData) => {
                    
                                        if(companyData) {
                                            var { transporter, mailingAddress } = await emailTransporter()
                                            var mailOptions2 = {
                                                from: mailingAddress,
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
                                                    logger.warn(`Failed to send invitation to ${request.body.email}`)
                                                    logger.error(error.message)
                                                    return console.log(error);
                                                }
                                                logger.info(`Invitation sent to ${request.body.email}`)
                                            });
                    
                                            logger.debug(JSON.stringify( {success: true, message: request.t('invitationSentSuccess')} ))
                                            return response.status(200)
                                                    .send({success: true, message: request.t('invitationSentSuccess')});
                                        } else {
                                            console.log('No Company data')
                                            logger.warn(`Failed to send invitation to ${request.body.email}`)
                                            logger.debug(JSON.stringify( {success: false, message: request.t('invitationSentFailed')} ))
                                            return response.status(200)
                                                    .send({success: false, message: request.t('invitationSentFailed')});
                                        }
                                    })
                                    .catch((err) => {
                                        logger.warn(`Failed to send invitation to ${request.body.email}`)
                                        logger.error(err)
                                        logger.debug(JSON.stringify( {success: false, message: request.t('invitationSentFailed')} ))
                                        return response.status(200)
                                                .send({success: false, message: request.t('invitationSentFailed')});
                                    })
                                })
                                .catch((err) => {
                                    logger.warn(`Failed to send invitation to ${request.body.email}`)
                                    logger.error(err)
                                    logger.debug(JSON.stringify( {success: false, message: request.t('invitationSentFailed')} ))
                                    return response.status(200)
                                            .send({success: false, message: request.t('invitationSentFailed')});
                                })
                            })
                            .catch((err) => {
                                logger.warn(`Failed to send invitation to ${request.body.email}`)
                                logger.error(err)
                                logger.debug(JSON.stringify( {success: false, message: request.t('invitationSentFailed')} ))
                                return response.status(200)
                                        .send({success: false, message: request.t('invitationSentFailed')});
                            })
                        } else {
                            logger.info(`Invitation already exists for ${request.body.email}`)
                            logger.debug(JSON.stringify( {success: false, message: request.t('invitationAlreadySent')} ))
                            return response.status(200)
                                .send({success: false, message: request.t('invitationAlreadySent')});
                        }
                    })
                }
            })
            .catch((err) => {
                logger.warn(`Failed to send invitation to ${request.body.email}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('invitationSentFailed')} ))
                return response.status(200)
                        .send({success: false, message: request.t('invitationSentFailed')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static getInvitationList(request, response) {
        const user = new Users(knex)

        if(
            request.body.limit &&
            request.body.companyId
        ) {
            request.body.offset = request.body.offset ? request.body.offset : 0
            logger.info(`Fetching invitation list for company Id ${request.body.companyId}`)
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
                        logger.info(`Invitation list successfully fetched for company Id ${request.body.companyId}`)
                        logger.debug(JSON.stringify( {success: true, invitationList, totalPageNum, noOfRecords} ))
                        return response.status(200)
                            .send({success: true, invitationList, totalPageNum, noOfRecords});
                    })
                })
                .catch((err) => {
                    logger.warn(`Failed to fetch invitation list for ${request.body.companyId}`)
                    logger.error(err)
                    logger.debug(JSON.stringify( {success: false, message: request.t('invitationListFetchFailed')} ))
                    return response.status(200)
                        .send({success: false, message: request.t('invitationListFetchFailed')});
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
                        logger.info(`Invitation list successfully fetched for company Id ${request.body.companyId}`)
                        logger.debug(JSON.stringify( {success: true, invitationList, totalPageNum, noOfRecords} ))
                        return response.status(200)
                            .send({success: true, invitationList, totalPageNum, noOfRecords});
                    })
                })
                .catch((err) => {
                    logger.warn(`Failed to fetch invitation list for ${request.body.companyId}`)
                    logger.error(err)
                    logger.debug(JSON.stringify( {success: false, message: request.t('invitationListFetchFailed')} ))
                    return response.status(200)
                            .send({success: false, message: request.t('invitationListFetchFailed')});
                })
            }
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static deleteInvitations(request, response) {
        const user = new Users(knex)

        if(
            request.body.invitationIds &&
            request.body.limit &&
            request.body.companyId
        ) {
            logger.info(`Deleting invitations for company ID ${request.body.companyId}`)
            user.deleteInvitations(
                request.body.invitationIds
            )
            .then((res) => {
                if(res == 1) {
                    logger.info(`Invitations deleted successfully for ${request.body.companyId}`)
                    logger.info(`Fetching updated list for company ID ${request.body.companyId}`)
                    user.getInvitationList(
                        0,
                        request.body.limit,
                        request.body.companyId
                    )
                    .then((invitationList) => {
                        user.getTotalNumberOfPageForInvitationList(request.body.limit, request.body.companyId)
                        .then((recordCounts) => {
                            const {totalPageNum, noOfRecords} = recordCounts
                            logger.info(`Updated invitation list fetched successfully for ${request.body.companyId}`)
                            logger.debug(JSON.stringify( {success: true, invitationList, totalPageNum, noOfRecords, message: request.t('userDeletionSuccess')} ))
                            return response.status(200)
                                .send({success: true, invitationList, totalPageNum, noOfRecords, message: request.t('userDeletionSuccess')});
                        })
                    })
                    .catch((err) => {
                        logger.error(err)
                        logger.warn(`Failed to fetch the updated the invitation list for company ID ${request.body.companyId}`)
                        logger.debug(JSON.stringify( {success: false, message: request.t('userDeletionFailed1')} ))
                        return response.status(200)
                                .send({success: false, message: request.t('userDeletionFailed1')});
                    })
                }
            })
            .catch((err) => {
                logger.warn(`Failed to delete the invitations for ${request.body.companyId}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('userDeletionFailed2')} ))
                return response.status(200)
                    .send({success: false, message: request.t('userDeletionFailed2')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static deleteInvitation(request, response) {
        const user = new Users(knex)

        if(
            request.body.invitationId &&
            request.body.limit &&
            request.body.companyId
        ) {
            logger.info(`Deleting invitation for company ID ${request.body.companyId}`)
            logger.warn(`Failed to delete the invitations for ${request.body.companyId}`)
            user.deleteInvitation(
                request.body.invitationId
            )
            .then((res) => {
                if(res == 1) {
                    logger.info(`Invitation deleted successfully for ${request.body.companyId}`)
                    logger.info(`Fetching updated list for company ID ${request.body.companyId}`)
                    user.getInvitationList(
                        0,
                        request.body.limit,
                        request.body.companyId
                    )
                    .then((invitationList) => {
                        user.getTotalNumberOfPageForInvitationList(request.body.limit, request.body.companyId)
                        .then((recordCounts) => {
                            const {totalPageNum, noOfRecords} = recordCounts
                            logger.info(`Updated invitation list fetched successfully for ${request.body.companyId}`)
                            logger.debug(JSON.stringify( {success: true, invitationList, totalPageNum, noOfRecords, message: request.t('userDeletionSuccess')} ))
                            return response.status(200)
                                .send({success: true, invitationList, totalPageNum, noOfRecords, message: request.t('userDeletionSuccess')});
                        })
                    })
                    .catch((err) => {
                        logger.warn(`Failed to fetch the updated the invitation list for company ID ${request.body.companyId}`)
                        logger.error(err)
                        logger.debug(JSON.stringify( {success: false, message: request.t('userDeletionFailed1')} ))
                        return response.status(200)
                                .send({success: false, message: request.t('userDeletionFailed1')});
                    })
                }
            })
            .catch((err) => {
                logger.warn(`Failed to delete the invitation for ${request.body.companyId}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('userDeletionFailed2')} ))
                return response.status(200)
                    .send({success: false, message: request.t('userDeletionFailed2')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static resendInvitation(request, response) {
        const user = new Users(knex)

        if(
            request.body.email &&
            request.body.limit &&
            request.body.companyId
        ) {
            request.body.offset = request.body.offset ? request.body.offset : 0
            logger.info(`Resending invitation to ${request.body.email}`)
            logger.info(`Checking if account registered under ${request.body.email}`)
            user.checkIfUserExist(request.body.email)
            .then((res) => {
                if(res.length > 0) {
                    logger.info(`Account exist under ${request.body.email}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('invitationSendFailedAlreadyRegistered')} ))
                    return response.status(200)
                        .send({success: false, message: request.t('invitationSendFailedAlreadyRegistered')});
                } else {
                    user.isInvitationSent(request.body.email)
                    .then((inviteSent) => {
                        if(inviteSent == 'yes') {
                            user.getInvitationDetail(request.body.email)
                            .then((inviteData) => {
                                if(inviteData && inviteData.status != 'Registered') {
                                    logger.info(`Cannot resend invitation, invitation already reagistered for ${request.body.email}`)
                                    user.updateInvitationToken(request.body.email)
                                    .then((data) => {
                                        const { res, token } = data
                                        if(res == 1) {
                                            user.getUserDetailsById(inviteData.sender)
                                            .then((_sender) => {
                                                const senderName = _sender.firstname
                                
                                                user.getCompanyDetails(inviteData.company)
                                                .then(async (companyData) => {
                                                    if(companyData) {
                                                        var { transporter, mailingAddress } = await emailTransporter()
                                                        var mailOptions2 = {
                                                            from: mailingAddress,
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
                                                                logger.warn(`Failed to resend invitation for ${request.body.email}`)
                                                                logger.error(error.message)
                                                                logger.debug(JSON.stringify( {success: false, message: request.t('invitationSentFailed')} ))
                                                                return response.status(200)
                                                                .send({success: false, message: request.t('invitationSentFailed')});;
                                                            }
                                                            
                                                            logger.info(`Fetching updated invitation list`)
                                                            user.getInvitationList(
                                                                request.body.offset,
                                                                request.body.limit,
                                                                request.body.companyId
                                                            )
                                                            .then((invitationList) => {
                                                                user.getTotalNumberOfPageForInvitationList(request.body.limit, request.body.companyId)
                                                                .then((recordCounts) => {
                                                                    const {totalPageNum, noOfRecords} = recordCounts
                                                                    logger.info(`Updated invitation list fetched successfully`)
                                                                    logger.debug(JSON.stringify( {success: true, invitationList, totalPageNum, noOfRecords, message: request.t('invitationSentSuccess')} ))
                                                                    return response.status(200)
                                                                        .send({success: true, invitationList, totalPageNum, noOfRecords, message: request.t('invitationSentSuccess')});
                                                                })
                                                            })
                                                            .catch((err) => {
                                                                logger.error(err)
                                                                logger.warn(`Failed to resend invitation to ${request.body.email}`)
                                                                logger.debug(JSON.stringify( {success: false, message: request.t('invitationSentFailed')} ))
                                                                return response.status(200)
                                                                        .send({success: false, message: request.t('invitationSentFailed')});
                                                            })
                                                        });
                                                    } else {
                                                        logger.warn(`Failed to resend invitation to ${request.body.email}`)
                                                        logger.debug(JSON.stringify( {success: false, message: request.t('invitationSentFailed')} ))
                                                        return response.status(200)
                                                                .send({success: false, message: request.t('invitationSentFailed')});
                                                    }
                                                })
                                                .catch((err) => {
                                                    logger.warn(`Failed to resend invitation to ${request.body.email}`)
                                                    logger.error(err)
                                                    logger.debug(JSON.stringify( {success: false, message: request.t('invitationSentFailed')} ))
                                                    return response.status(200)
                                                            .send({success: false, message: request.t('invitationSentFailed')});
                                                })
                                            })
                                            .catch((err) => {
                                                logger.warn(`Failed to resend invitation to ${request.body.email}`)
                                                logger.error(err)
                                                logger.debug(JSON.stringify( {success: false, message: request.t('invitationSentFailed')} ))
                                                return response.status(200)
                                                    .send({success: false, message: request.t('invitationSentFailed')});
                                            })
                                        } else {
                                            logger.warn(`Failed to resend invitation to ${request.body.email}`)
                                            logger.debug(JSON.stringify( {success: false, message: request.t('invitationSentFailed')} ))
                                            return response.status(200)
                                                .send({success: false, message: request.t('invitationSentFailed')});
                                        }
                                    })
                                } else {
                                    logger.warn(`Failed to resend invitation to ${request.body.email}`)
                                    logger.debug(JSON.stringify( {success: false, message: request.t('invitationSendFailedAlreadyRegistered')} ))
                                    return response.status(200)
                                        .send({success: false, message: request.t('invitationSendFailedAlreadyRegistered')});
                                }
                            })
                        } else {
                            logger.warn(`Failed to resend invitation to ${request.body.email}`)
                            logger.debug(JSON.stringify( {success: false, message: request.t('invitationNotExist')} ))
                            return response.status(200)
                                .send({success: false, message: request.t('invitationNotExist')});
                        }
                    })
                }
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static getInvitationData(request, response) {
        const user = new Users(knex) 

        if(
            request.body.email &&
            request.body.token
        ) {
            logger.info(`Fetching invitation detail for ${request.body.email}`)
            user.getInvitationDetail(request.body.email)
            .then((invitationData) => {
                if(invitationData) {
                    const tnow = Date.now()
                    const tDiff = tnow - parseInt(invitationData.token_issued)

                    if(invitationData.status == 'Pending') {
                        if(tDiff < 43200000) {
                            if(invitationData.token == request.body.token) {
                                logger.info(`Valid invitation provided by ${request.body.email}`)
                                logger.debug(JSON.stringify( {success: true, status: 'valid', invitationData} ))
                                return response.status(200)
                                .send({success: true, status: 'valid', invitationData});
                            } else {
                                logger.warn(`Invalid invitation provided by ${request.body.email}`)
                                logger.debug(JSON.stringify( {success: false, status: 'invalid-token'} ))
                                return response.status(200)
                                .send({success: false, status: 'invalid-token'});
                            }
                        } else {
                            logger.info(`Expired invitation provided by ${request.body.email}`)
                            logger.debug(JSON.stringify( {success: false, status: 'expired'} ))
                            return response.status(200)
                                .send({success: false, status: 'expired'});
                        }
                    } else if(invitationData.status == 'Declined') {
                        logger.info(`Declined invitation provided by ${request.body.email}`)
                        logger.debug(JSON.stringify( {success: false, status: 'declined'} ))
                        return response.status(200)
                            .send({success: false, status: 'declined'});
                    } else if(invitationData.status == 'Registered') {
                        logger.info(`Registered invitation provided by ${request.body.email}`)
                        logger.debug(JSON.stringify( {success: false, status: 'registered'} ))
                        return response.status(200)
                            .send({success: false, status: 'registered'});
                    }
                } else {
                    logger.warn(`Invalid invitation provided by ${request.body.email}`)
                    logger.debug(JSON.stringify( {success: false, status: 'invalid'} ))
                    return response.status(200)
                            .send({success: false, status: 'invalid'});
                }
            })
            .catch((err) => {
                logger.warn(`Invalid invitation provided by ${request.body.email}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, status: 'invalid'} ))
                return response.status(200)
                            .send({success: false, status: 'invalid'});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static createAccountForInvitedUser(request, response) {
        const user = new Users(knex) 

        if(
            request.body.firstname &&
            request.body.lastname &&
            request.body.email &&
            request.body.mobileNumber &&
            request.body.password &&
            companyData.companytwoFactorAuth &&
            request.body.companyId &&
            request.body.role &&
            request.body.token
        ) {
            const debugData = {
                url: request.protocol + '://' + request.get('host') + request.originalUrl,
                body: {...request.body, password: '**********'},
                headers: request.headers
            }
            logger.debug(JSON.stringify( debugData ))
            logger.info(`Creating account for invited user ${request.body.email}`)
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
                                                        .then(async (senderData) => {
                                                            var { transporter, mailingAddress } = await emailTransporter()
                                                            var mailOptions2 = {
                                                                from: mailingAddress,
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
                                                                logger.info(`Acceptance mail sent to invitation sender ${senderData.email}`)
                                                            });
                                                        })
    
                                                        logger.info(`Account created for ${request.body.email}`)
                                                        logger.debug(JSON.stringify( { success: true, message: request.t('Authentication success'), userData, twoFactorAuth: companyData.twoFactorAuth } ))
                                                        return response.status(200)
                                                            .send({ success: true, message: request.t('Authentication success'), userData, twoFactorAuth: companyData.twoFactorAuth });
                                                    })
                                                })
                                                .catch((err) => {
                                                    logger.warn(`Account creation failed for ${request.body.email}`)
                                                    logger.error(err)
                                                    logger.debug(JSON.stringify( { success: false, message: request.t('accountCreationFailed') } ))
                                                    return response.status(200)
                                                        .send({ success: false, message: request.t('accountCreationFailed') })
                                                })
                                            })
                                            .catch((err) => {
                                                logger.warn(`Account creation failed for ${request.body.email}`)
                                                logger.error(err)
                                                logger.debug(JSON.stringify( { success: false, message: request.t('accountCreationFailed') } ))
                                                return response.status(200)
                                                .send({ success: false, message: request.t('accountCreationFailed') })
                                            })
                                        })
                                        .catch((err) => {
                                            logger.warn(`Account creation failed for ${request.body.email}`)
                                            logger.error(err)
                                            logger.debug(JSON.stringify( { success: false, message: request.t('accountCreationFailed') } ))
                                            return response.status(200)
                                            .send({ success: false, message: request.t('accountCreationFailed') })
                                        })
                                    } else {
                                        logger.warn(`Account creation failed for ${request.body.email} due to invalid company`)
                                        logger.debug(JSON.stringify( { success: false, message: request.t('accountCreationFailedInvalidCompany') } ))
                                        return response.status(200)
                                            .send({ success: false, message: request.t('accountCreationFailedInvalidCompany') })
                                    }
                                })
                                .catch((err) => {
                                    logger.warn(`Account creation failed for ${request.body.email} due to invalid company`)
                                    logger.error(err)
                                    logger.debug(JSON.stringify( { success: false, message: request.t('accountCreationFailedInvalidCompany') } ))
                                    return response.status(200)
                                            .send({ success: false, message: request.t('accountCreationFailedInvalidCompany') })
                                })
                            } else {
                                logger.warn(`Account creation failed for ${request.body.email} due to invalid token`)
                                logger.debug(JSON.stringify( {success: false, message: request.t('invalidToken')} ))
                                return response.status(200)
                                .send({success: false, message: request.t('invalidToken')});
                            }
                        } else {
                            logger.warn(`Account creation failed for ${request.body.email} due to expired invitation`)
                            logger.debug(JSON.stringify( {success: false, message: request.t('invitationExpired')} ))
                            return response.status(200)
                                .send({success: false, message: request.t('invitationExpired')});
                        }
                    } else if(invitationData.status == 'Declined') {
                        logger.warn(`Account creation failed for ${request.body.email} due to declined invitation`)
                        logger.debug(JSON.stringify( {success: false, message: request.t('invitationDeclined')} ))
                        return response.status(200)
                            .send({success: false, message: request.t('invitationDeclined')});
                    } else if(invitationData.status == 'Registered') {
                        logger.warn(`Account creation failed for ${request.body.email} due to registered invitation`)
                        logger.debug(JSON.stringify( {success: false, message: request.t('accountAlreadyRegistered')} ))
                        return response.status(200)
                            .send({success: false, message: request.t('accountAlreadyRegistered')});
                    }
                } else {
                    logger.warn(`Account creation failed for ${request.body.email} due to invalid invitation`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('invalidInvitation')} ))
                    return response.status(200)
                            .send({success: false, message: request.t('invalidInvitation')});
                }
            })
            .catch((err) => {
                logger.warn(`Account creation failed for ${request.body.email} due to invalid invitation`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('invalidInvitation')} ))
                return response.status(200)
                            .send({success: false, message: request.t('invalidInvitation')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static declineInvitation(request, response) {
        const user = new Users(knex)

        if(
            request.body.email &&
            request.body.token
        ) {
            logger.info(`Declining invitation for ${request.body.email}`)
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
                                                .then(async (senderData) => {
                                                    var { transporter, mailingAddress } = await emailTransporter()
                                                    var mailOptions2 = {
                                                        from: mailingAddress,
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
                                                        logger.info(`Decline mail sent to invitation sender ${senderData.email}`)
                                                    });
                                                })
                                                logger.info(`Invitation declined for ${request.body.email}`)
                                                logger.debug(JSON.stringify( { success: true, message: request.t('invitationDeclineSuccess') } ))
                                                return response.status(200)
                                                    .send({ success: true, message: request.t('invitationDeclineSuccess') })                               	
                                            } else {
                                                logger.warn(`Failed to decline invitation for ${request.body.email}`)
                                                logger.debug(JSON.stringify( { success: true, status: 'failed', message: request.t('invitationDeclineFailed') } ))
                                                return response.status(200)
                                                    .send({ success: true, status: 'failed', message: request.t('invitationDeclineFailed') })
                                            }
                                        })
                                    } else {
                                        logger.warn(`Failed to decline invitation for ${request.body.email}`)
                                        logger.debug(JSON.stringify( { success: false, status: 'failed', message: request.t('invitationDeclineFailed') } ))
                                        return response.status(200)
                                            .send({ success: false, status: 'failed', message: request.t('invitationDeclineFailed') })
                                    }
                                })
                                .catch((err) => {
                                    logger.warn(`Failed to decline invitation for ${request.body.email}`)
                                    logger.error(err)
                                    logger.debug(JSON.stringify( { success: false, status: 'failed', message: request.t('invitationDeclineFailed') } ))
                                    return response.status(200)
                                            .send({ success: false, status: 'failed', message: request.t('invitationDeclineFailed') })
                                })
                            } else {
                                logger.warn(`Failed to decline invitation for ${request.body.email} due to invalid token`)
                                logger.debug(JSON.stringify( {success: false, status: 'invalid-token', message: request.t('invitationDeclineFailedInvalidToken')} ))
                                return response.status(200)
                                .send({success: false, status: 'invalid-token', message: request.t('invitationDeclineFailedInvalidToken')});
                            }
                        } else {
                            logger.warn(`Failed to decline invitation for ${request.body.email} due to expired invitation`)
                            logger.debug(JSON.stringify( {success: false, status: 'expired', message: request.t('invitationExpired')} ))
                            return response.status(200)
                                .send({success: false, status: 'expired', message: request.t('invitationExpired')});
                        }
                    } else if(invitationData.status == 'Declined') {
                        logger.warn(`Failed to decline invitation for ${request.body.email} due to declined invitation`)
                        logger.debug(JSON.stringify( {success: false, status: 'declined', message: request.t('invitationDeclined')} ))
                        return response.status(200)
                            .send({success: false, status: 'declined', message: request.t('invitationDeclined')});
                    } else if(invitationData.status == 'Registered') {
                        logger.warn(`Failed to decline invitation for ${request.body.email} due to registered invitation`)
                        logger.debug(JSON.stringify( {success: false, status: 'registered', message: request.t('accountAlreadyRegistered')} ))
                        return response.status(200)
                            .send({success: false, status: 'registered', message: request.t('accountAlreadyRegistered')});
                    }
                } else {
                    logger.warn(`Failed to decline invitation for ${request.body.email} due to invalid invitation`)
                    logger.debug(JSON.stringify( {success: false, status: 'invalid', message: request.t('invalidInvitation')} ))
                    return response.status(200)
                            .send({success: false, status: 'invalid', message: request.t('invalidInvitation')});
                }
            })
            .catch((err) => {
                logger.warn(`Failed to decline invitation for ${request.body.email} due to invalid invitation`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, status: 'invalid', message: request.t('invalidInvitation')} ))
                return response.status(200)
                            .send({success: false, status: 'invalid', message: request.t('invalidInvitation')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static getUserDetailsForAdmin(request, response) {
        const user = new Users(knex)

        if(request.body.userId) {
            logger.info(`Fetching user details for user ID ${request.body.userId}`)
            user.getUserDetailsById(request.body.userId)
            .then((userData) => {
                user.getCompanyRole(request.body.userId)
                .then((roleData) => {
                    userData = {...userData, role: roleData.role}
                    logger.info(`User details successfully fethced for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: true, message: request.t('adminUserDetailFetchSuccess'), userData} ))
                    return response.status(200)
                    .send({success: true, message: request.t('adminUserDetailFetchSuccess'), userData});
                })
                .catch((err) => {
                    logger.warn(`User details successfully fethced but failed to fetch role data for ${request.body.userId}`)
                    logger.error(err)
                    userData = {...userData, role: '3'}
                    logger.debug(JSON.stringify( {success: true, message: request.t('adminUserDetailFetchFailed1'), userData} ))
                    return response.status(200)
                    .send({success: true, message: request.t('adminUserDetailFetchFailed1'), userData});
                })
            })
            .catch((err) => {
                logger.warn(`Failed to fetch user details for user ID ${request.body.userId}`)
                logger.debug(JSON.stringify( {success: false, message: request.t('adminUserDetailFetchFailed2')} ))
                return response.status(200)
                    .send({success: false, message: request.t('adminUserDetailFetchFailed2')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static verifyAccountForAdmin(request, response) {
        const user = new Users(knex)

        if(request.body.userId) {
            logger.info(`Verifying account for user Id ${request.body.userId}`)
            user.verifyAccount(request.body.userId)
            .then((res) => {
                if(res == 1) {
                    logger.info(`Account verification success for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: true, message: request.t('accountVerificationSuccess')} ))
                    return response.status(200)
                        .send({success: true, message: request.t('accountVerificationSuccess')});
                } else {
                    logger.warn(`Account verification failed for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('accountVerificationFailed')} ))
                    return response.status(200)
                        .send({success: false, message: request.t('accountVerificationFailed')});
                }
            })
            .catch((err) => {
                logger.warn(`Account verification failed for ${request.body.userId}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('accountVerificationFailed')} ))
                return response.status(200)
                        .send({success: false, message: request.t('accountVerificationFailed')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static enable2FAFordmin(request, response) {
        const user = new Users(knex)

        if(request.body.userId) {
            logger.info(`Enabling 2FA for user Id ${request.body.userId}`)
            user.enable2FA(request.body.userId)
            .then((res) => {
                if(res == 1) {
                    logger.info(`2FA enabled successfully for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: true, message: request.t('2FAEnableSuccess')} ))
                    return response.status(200)
                            .send({success: true, message: request.t('2FAEnableSuccess')});
                } else {
                    logger.warn(`Failed to enable 2FA for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('2FAEnableFailed')} ))
                    return response.status(200)
                            .send({success: false, message: request.t('2FAEnableFailed')});
                }
            })
            .catch((err) => {
                logger.warn(`Failed to enable 2FA for ${request.body.userId}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('2FAEnableFailed')} ))
                return response.status(200)
                            .send({success: false, message: request.t('2FAEnableFailed')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static disable2FAFordmin(request, response) {
        const user = new Users(knex)

        if(request.body.userId) {
            logger.info(`Disabling 2FA for ${request.body.userId}`)
            user.disable2FA(request.body.userId)
            .then((res) => {
                if(res == 1) {
                    logger.info(`2FA disabled successfully for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: true, message: request.t('2FADisableSuccess')} ))
                    return response.status(200)
                            .send({success: true, message: request.t('2FADisableSuccess')});
                } else {
                    logger.warn(`Failed to disable 2FA for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('2FADisableFailed')} ))
                    return response.status(200)
                            .send({success: false, message: request.t('2FADisableFailed')});
                }
            })
            .catch((err) => {
                logger.warn(`Failed to disable 2FA for ${request.body.userId}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('2FADisableFailed')} ))
                return response.status(200)
                            .send({success: false, message: request.t('2FADisableFailed')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static userLockAndUnlockOptionForAdmin(request, response) {
        const user = new Users(knex)

        if(request.body.userId) {
            request.body.status = request.body.status ? request.body.status : 0
            logger.info(`Changing account status for user Id ${request.body.userId}`)
            user.userLockAndUnlockOptionForAdmin(request.body.userId, request.body.status)
            .then((res) => {
                if(res == 1) {
                    if(request.body.status == '1') {
                        logger.info(`Account status changed to locked for ${request.body.userId}`)
                        logger.debug(JSON.stringify( {success: true, message: request.t('userAccountLockedSuccess')} ))
                        return response.status(200)
                            .send({success: true, message: request.t('userAccountLockedSuccess')});
                    } else {
                        logger.info(`Account status changed to unlocked for ${request.body.userId}`)
                        logger.debug(JSON.stringify( {success: true, message: request.t('userAccountUnlockedSuccess')} ))
                        return response.status(200)
                            .send({success: true, message: request.t('userAccountUnlockedSuccess')});
                    }
                } else {
                    logger.warn(`Failed to change the account status for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('userAccountLockFailed')} ))
                    return response.status(200)
                            .send({success: false, message: request.t('userAccountLockFailed')});
                }
            })
            .catch((err) => {
                logger.warn(`Failed to change the account status for ${request.body.userId}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('userAccountLockFailed')} ))
                return response.status(200)
                            .send({success: false, message: request.t('userAccountLockFailed')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static adminUpdatePasswordOptionForUser(request, response) {
        const user = new Users(knex)

        if(request.body.userId && request.body.newPassword) {
            logger.info(`Updating password for ${request.body.userId}`)
            user.updatePassword(request.body.userId, request.body.newPassword)
            .then((res) => {
                if(res == 1) {
                    logger.info(`Password updated successfully for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: true, message: request.t('adminPasswordUpdateSuccess')} ))
                    return response.status(200)
                        .send({success: true, message: request.t('adminPasswordUpdateSuccess')});
                } else {
                    logger.warn(`Failed to update the password for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('adminPasswordUpdateFailed')} ))
                    return response.status(200)
                        .send({success: false, message: request.t('adminPasswordUpdateFailed')});
                }
            })
            .catch((err) => {
                logger.warn(`Failed to update the password for ${request.body.userId}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('adminPasswordUpdateFailed')} ))
                return response.status(200)
                        .send({success: false, message: request.t('adminPasswordUpdateFailed')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static whiteListUserAccount(request, response) {
        const user = new Users(knex)

        if(request.body.userId) {
            logger.info(`Whitelisting account for ${request.body.userId}`)
            user.whiteListAccount(request.body.userId)
            .then((res) => {
                if(res == 1) {
                    logger.info(`Account whitelisted for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: true, message: request.t('accountWhitelistedSuccess')} ))
                    return response.status(200)
                        .send({success: true, message: request.t('accountWhitelistedSuccess')});
                } else {
                    logger.warn(`Failed to whitelist account for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('accountWhitelistedFailed')} ))
                    return response.status(200)
                        .send({success: false, message: request.t('accountWhitelistedFailed')});
                }
            })
            .catch((err) => {
                logger.warn(`Failed to whitelist account for ${request.body.userId}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('accountWhitelistedFailed')} ))
                return response.status(200)
                        .send({success: false, message: request.t('accountWhitelistedFailed')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static blackListUserAccount(request, response) {
        const user = new Users(knex)

        if(request.body.userId) {
            logger.info(`Blacklisting account for ${request.body.userId}`)
            user.blackListAccount(request.body.userId)
            .then((res) => {
                if(res == 1) {
                    logger.info(`Account blacklisted for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: true, message: request.t('accountBlacklistedSuccess')} ))
                    return response.status(200)
                        .send({success: true, message: request.t('accountBlacklistedSuccess')});
                } else {
                    logger.warn(`Failed to blacklist the account for ${request.body.userId}`)
                    logger.debug(JSON.stringify( {success: false, message: request.t('accountBlacklistedFailed')} ))
                    return response.status(200)
                        .send({success: false, message: request.t('accountBlacklistedFailed')});
                }
            })
            .catch((err) => {
                logger.warn(`Failed to blacklist the account for ${request.body.userId}`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('accountBlacklistedFailed')} ))
                return response.status(200)
                        .send({success: false, message: request.t('accountBlacklistedFailed')});
            })
        } else {
            logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
            return response.status(400)
                    .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }
}

module.exports = UsersController