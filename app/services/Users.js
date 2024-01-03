const user = require("../routes/user")
const SuperAdmin = require('./SuperAdmin')
const winston = require('winston');
const { combine, timestamp, json } = winston.format;
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
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

class Users {

    constructor(dbConnection) {
        this.dbConnection = dbConnection
    }

    createNewUserGoogle(
        firstname,
        lastname,
        email,
        profilePic,
        accountType
    ) {
        return new Promise((resolve, reject) => {

            const token = this.getRandomIntInclusive()
            const token_issued = Date.now()
            const dateTime = new Date()

            this.dbConnection('users').insert(
                {
                    firstname,
                    lastname,
                    email,
                    mobileNumber: '(000)-000-0000',
                    password: '',
                    accountStatus: 1,
                    token,
                    token_issued,
                    created: dateTime,
                    updated: dateTime
                }
            ).then(async (userId) => {
                try {
                    await this._addUserMeta(userId[0], 'otp', '')
                    await this._addUserMeta(userId[0], 'otp_issued', '')
                    await this._addUserMeta(userId[0], 'incorrect_attempt_count', 0)
                    await this._addUserMeta(userId[0], 'attempt_timestamp', '')
                    await this._addUserMeta(userId[0], 'accountLockStatus', 0)
                    await this._addUserMeta(userId[0], 'profilePic', profilePic)
                    await this._addUserMeta(userId[0], 'accountBlocked', '0')

                    const superAdmin = new SuperAdmin(this.dbConnection)
                    let default2FA = '0'
                    if(process.env.CACHE_MODE == 'enabled') {
                        const settings = await superAdmin.getDataFromRedis(process.env.REDIS_SUPER_ADMIN_SETTINGS_KEY)
                        default2FA = settings['default2FA']
                    } else {
                        const default2FASetting = await superAdmin.getSettings('default2FA')
                        default2FA = default2FASetting[0]['meta_value']
                    }
                    
                    console.log('default2FA', default2FA)
                    await this._addUserMeta(userId[0], '2FA', default2FA)
                    await this._addUserMeta(userId[0], 'accountType', accountType)

                    resolve({
                        userId: userId[0],
                        token,
                        default2FA: default2FA
                    })
                } catch (error) {
                    console.log(error)
                    logger.error(error)
                    reject(error)
                }
            })
        })
    }

    validateGoogleLoginCredential(email) {
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({
                email: email
            }).select('id')
                .then((res) => {
                    if (res.length > 0) {
                        this.isAccountLockedForIncorrectOtpAccount(res[0].id)
                            .then((stat) => {
                                if (stat == 0) {
                                    resolve(
                                        {
                                            stat: 'valid',
                                            userId: res[0].id,
                                        }
                                    )
                                } else {
                                    resolve(
                                        {
                                            stat: 'locked'
                                        }
                                    )
                                }
                            })
                            .catch((err) => {
                                console.log(err)
                                reject(err)
                            })
                    } else {
                        resolve({ stat: 'invalid' })
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    validateGoogleCredentialAndOtp(email, otp) {
        return new Promise((resolve, reject) => {
            this.validateGoogleLoginCredential(email).then((res) => {
                const currentTimestamp = Date.now()
                if (res.stat == 'valid') {
                    this.isAccountLockedForIncorrectOtpAccount(res.userId)
                        .then((stat) => {
                            if (stat == 0) {
                                this.getUserMetaValue(res.userId, 'otp').then((otpInRecord) => {
                                    if (otpInRecord == otp) {
                                        this.getUserMetaValue(res.userId, 'otp_issued').then((otpIssuedTime) => {
                                            const tDiff = currentTimestamp - otpIssuedTime
                                            if (tDiff <= 600000) {
                                                resolve('valid')
                                            } else {
                                                resolve('expired')
                                            }
                                        })
                                    } else {
                                        this.updateIncorrectOTPAttemptRecord(res.userId)
                                        resolve('Invalid OTP')
                                    }
                                })
                            } else {
                                resolve('locked')
                            }
                        })
                } else if (res.stat == 'locked') {
                    resolve('locked')
                } else {
                    resolve('Invalid Credential')
                }
            })
        })
    }

    getAccountType(userId) {
        return new Promise((resolve, reject) => {
            this.getUserMetaValue(userId, 'accountType')
            .then((accountType) => {
                resolve(accountType)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    createNewUser(
        firstname,
        lastname,
        email,
        mobileNumber,
        password,
        accountType,
        paidStatus
    ) {
        return new Promise((resolve, reject) => {

            const token = this.getRandomIntInclusive()
            const token_issued = Date.now()
            const dateTime = new Date()

            this.generateHash(password)
            .then((hashedPassword) => {
                this.dbConnection('users').insert(
                    {
                        firstname,
                        lastname,
                        email,
                        mobileNumber,
                        password: hashedPassword,
                        accountStatus: 0,
                        token,
                        token_issued,
                        created: dateTime,
                        updated: dateTime
                    }
                ).then(async (userId) => {
                    try {
                        await this._addUserMeta(userId[0], 'otp', '')
                        await this._addUserMeta(userId[0], 'otp_issued', '')
                        await this._addUserMeta(userId[0], 'incorrect_attempt_count', 0)
                        await this._addUserMeta(userId[0], 'attempt_timestamp', '')
                        await this._addUserMeta(userId[0], 'accountLockStatus', 0)
                        await this._addUserMeta(userId[0], 'profilePic', 'default.png')
                        await this._addUserMeta(userId[0], 'accountBlocked', paidStatus == '1' ? '0' : '1')

                        const superAdmin = new SuperAdmin(this.dbConnection)
                        let default2FA = '0'
                        if(process.env.CACHE_MODE == 'enabled') {
                            const settings = await superAdmin.getDataFromRedis(process.env.REDIS_SUPER_ADMIN_SETTINGS_KEY)
                            default2FA = settings['default2FA']
                        } else {
                            const default2FASetting = await superAdmin.getSettings('default2FA')
                            default2FA = default2FASetting[0]['meta_value']
                        }
                        await this._addUserMeta(userId[0], '2FA', default2FA)
                        await this._addUserMeta(userId[0], 'accountType', accountType)
    
                        resolve({
                            userId: userId[0],
                            token,
                            default2FA: default2FA
                        })
                    } catch (error) {
                        console.log(error)
                        logger.error(error)
                        reject(error)
                    }
                })
                .catch((err) => {
                    console.log(error)
                    logger.error(err)
                    reject(err)
                })
            })
        })
    }

    createNewAccountForInvitedUser(
        firstname,
        lastname,
        email,
        mobileNumber,
        password,
        companytwoFactorAuth,
        companyId,
        role
    ) {
        return new Promise((resolve, reject) => {
            const token = this.getRandomIntInclusive()
            const token_issued = Date.now()
            const dateTime = new Date()

            this.generateHash(password)
            .then((hashedPassword) => {
                this.dbConnection('users').insert(
                    {
                        firstname,
                        lastname,
                        email,
                        mobileNumber,
                        password: hashedPassword,
                        accountStatus: 1,
                        token,
                        token_issued,
                        created: dateTime,
                        updated: dateTime
                    }
                ).then(async (userId) => {
                    try {
                        await this._addUserMeta(userId[0], 'otp', '')
                        await this._addUserMeta(userId[0], 'otp_issued', '')
                        await this._addUserMeta(userId[0], 'incorrect_attempt_count', 0)
                        await this._addUserMeta(userId[0], 'attempt_timestamp', '')
                        await this._addUserMeta(userId[0], 'accountLockStatus', 0)
                        await this._addUserMeta(userId[0], 'profilePic', 'default.png')
                        await this._addUserMeta(userId[0], '2FA', companytwoFactorAuth ? '1' : '0')
                        await this._addUserMeta(userId[0], 'accountBlocked', '0')
                        
                        await this.addRoleAndCompanyToUser(userId, companyId, role)
    
                        resolve({
                            userId: userId[0]
                        })
                    } catch (error) {
                        logger.error(error)
                        reject(error)
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    generateHash(password) {
        return new Promise((resolve, reject) => {
            bcrypt.hash(password, parseInt(process.env.SALT_ROUND))
            .then(function(hash) {
                resolve(hash)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    comparePassword(password, userId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({
                id: userId
            }).select('password')
            .then((res) => {
                if(res.length > 0) {
                    bcrypt.compare(password, res[0].password)
                    .then((isValidPassword) => {
                        if(isValidPassword) {
                            resolve(1)
                        } else {
                            resolve(0)
                        }
                    })
                    .catch((err) => {
                        console.log(err)
                        reject(err)
                    })
                } else {
                    resolve(0)
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    createNewCompany(
        userId,
        companyName,
        phoneNumber,
        companyType,
        mailingAddStreetName,
        mailingAddCityName,
        mailingAddState,
        mailingAddZip,
        billingAddStreetName,
        billingAddCityName,
        billingAddState,
        billingAddZip,
        isMailAndBillAddressSame
    ) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection('companies').insert(
                {
                    adminId: userId,
                    company_name: companyName,
                    company_phone: phoneNumber,
                    company_type: companyType,
                    created: dateTime,
                    updated: dateTime
                }
            ).then(async (_companyId) => {
                try {
                    await this.addCompanyMeta(_companyId[0], 'mailingAddStreetName', mailingAddStreetName)
                    await this.addCompanyMeta(_companyId[0], 'mailingAddCityName', mailingAddCityName)
                    await this.addCompanyMeta(_companyId[0], 'mailingAddState', mailingAddState)
                    await this.addCompanyMeta(_companyId[0], 'mailingAddZip', mailingAddZip)
                    await this.addCompanyMeta(_companyId[0], 'billingAddStreetName', billingAddStreetName)
                    await this.addCompanyMeta(_companyId[0], 'billingAddCityName', billingAddCityName)
                    await this.addCompanyMeta(_companyId[0], 'billingAddState', billingAddState)
                    await this.addCompanyMeta(_companyId[0], 'billingAddZip', billingAddZip)
                    await this.addCompanyMeta(_companyId[0], 'companyLogo', 'default.png')

                    const superAdmin = new SuperAdmin(this.dbConnection)
                    let default2FA = '0'
                    if(process.env.CACHE_MODE == 'enabled') {
                        const settings = await superAdmin.getDataFromRedis(process.env.REDIS_SUPER_ADMIN_SETTINGS_KEY)
                        default2FA = settings['default2FA']
                    } else {
                        const default2FASetting = await superAdmin.getSettings('default2FA')
                        default2FA = default2FASetting[0]['meta_value']
                    }
                    await this.addCompanyMeta(_companyId[0], '2FA', default2FA)
                    await this.addCompanyMeta(_companyId[0], 'isMailAndBillAddressSame', isMailAndBillAddressSame == true ? '1' : '0')

                    await this.addRoleAndCompanyToUser(userId, _companyId, 1)
    
                    resolve({
                        companyId: _companyId,
                        companyDefault2FA: default2FA
                    })
                } catch (error) {
                    logger.error(error)
                    reject(error)
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    addSubscriptionData(
        userId,
        paymentId,
        subscriptionType,
        subscriptionAmount,
        paymentStatus
    ) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection('subscriptions').insert(
                {
                    userId: userId,
                    payment_id: paymentId,
                    subscription_type: subscriptionType,
                    subscription_amount: subscriptionAmount,
                    payment_status: paymentStatus,
                    created: dateTime
                }
            )
            .then((res) => {
                resolve(res)
            })
            .catch((err) => {
                reject(err)
            })
        })
    }

    checkPaymentStatus(email) {
        return new Promise((resolve, reject) => {
            this.dbConnection("users")
            .select('id')
            .where({ email })
            .then((res) => {
                if(res.length > 0) {
                    this.dbConnection('subscriptions')
                    .select('payment_status')
                    .where({ userId: res[0]['id'] })
                    .then((res) => {
                        if(res.length > 0) {
                            if(res[0]['payment_status'] == '1') {
                                resolve('success')
                            } else {
                                resolve('failed')
                            }
                        } else {
                            resolve('pending')
                        }
                    })
                } else {
                    resolve('pending')
                }   
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    addRoleAndCompanyToUser(userId, companyId, role) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()
            this.dbConnection('user_company_role_relationship')
            .insert({
                userId,
                company: companyId,
                role,
                created: dateTime,
                updated: dateTime
            })
            .then((res) => {
                if(res) {
                    resolve(res)
                } else {
                    reject(false)
                }
            })
            .catch((err) => {
                reject(err)
            })
        })
    }

    adminRoleUpdateForUser(userId, companyId, role) {
        return new Promise((resolve, reject) => {
            this.dbConnection.raw(
                'Update user_company_role_relationship set role = ? where userId = ? and company = ?',
                [role, userId, companyId]
            )
            .then((res) => {
                console.log(res)
                resolve(1)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    addCompanyMeta(
        companyId,
        metaKey,
        metaValue
    ) {
        if(companyId) {
            return new Promise((resolve, reject) => {
                this.dbConnection('companies_meta').insert(
                    {
                        companyId,
                        metaKey,
                        metaValue
                    }
                ).then((result) => {
                    if(result) {
                        resolve(true)
                    } else {
                        reject(false)
                    }
                }).catch((err) => {
                    logger.error(err)
                    reject(false)
                })
            })
        }
    }

    updateUser(
        userId,
        firstname,
        lastname,
        mobileNumber,
        profilePic
    ) {
        return new Promise((resolve, reject) => {

            const dateTime = new Date()

            this.dbConnection('users')
            .where({ id: userId })
            .update(
                {
                    firstname,
                    lastname,
                    mobileNumber,
                    updated: dateTime
                }
            ).then(async (res) => {
                if(res == 1) {
                    if(profilePic && profilePic != '') {
                        await this.updateUserMeta(userId, 'profilePic', profilePic)
                    }

                    resolve(1)
                } else {
                    resolve(0)
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    adminUserUpdate(
        userId,
        firstname,
        lastname,
        email,
        mobileNumber,
        profilePic
    ) {
        return new Promise((resolve, reject) => {

            const dateTime = new Date()

            this.dbConnection('users')
            .where({ id: userId })
            .update(
                {
                    firstname,
                    lastname,
                    email,
                    mobileNumber,
                    updated: dateTime
                }
            ).then(async (res) => {
                if(res == 1) {
                    if(profilePic && profilePic != '') {
                        await this.updateUserMeta(userId, 'profilePic', profilePic)
                    }

                    resolve(1)
                } else {
                    resolve(0)
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    updateCompany(
        companyId,
        phoneNumber,
        companyName,
        companyType,
        mailingAddStreetName,
        mailingAddCityName,
        mailingAddState,
        mailingAddZip,
        billingAddStreetName,
        billingAddCityName,
        billingAddState,
        billingAddZip,
        isMailAndBillAddressSame,
        companyLogo
    ) {
        return new Promise((resolve, reject) => {

            const dateTime = new Date()

            this.dbConnection('companies')
            .where({ id: companyId })
            .update(
                {
                    company_name: companyName,
                    company_phone: phoneNumber,
                    company_type: companyType,
                    updated: dateTime
                }
            ).then(async (res) => {
                if(res == 1) {
                    await this.updateCompanyMeta(companyId, 'mailingAddStreetName', mailingAddStreetName)
                    await this.updateCompanyMeta(companyId, 'mailingAddCityName', mailingAddCityName)
                    await this.updateCompanyMeta(companyId, 'mailingAddState', mailingAddState)
                    await this.updateCompanyMeta(companyId, 'mailingAddZip', mailingAddZip)
                    await this.updateCompanyMeta(companyId, 'billingAddStreetName', billingAddStreetName)
                    await this.updateCompanyMeta(companyId, 'billingAddCityName', billingAddCityName)
                    await this.updateCompanyMeta(companyId, 'billingAddState', billingAddState)
                    await this.updateCompanyMeta(companyId, 'billingAddZip', billingAddZip)
                    await this.updateCompanyMeta(companyId, 'isMailAndBillAddressSame', isMailAndBillAddressSame == 'true' ? '1' : '0')

                    if(companyLogo && companyLogo != '') {
                        await this.updateCompanyMeta(companyId, 'companyLogo', companyLogo)
                    }

                    resolve(1)
                } else {
                    resolve(0)
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    _addUserMeta(userId, metaKey, metaValue) {
        if(userId) {
            return new Promise((resolve, reject) => {
                this.dbConnection('users_meta').insert(
                    {
                        userId,
                        metaKey,
                        metaValue
                    }
                ).then((result) => {
                    if(result) {
                        resolve(true)
                    } else {
                        reject(false)
                    }
                }).catch((err) => {
                    logger.error(err)
                    reject(false)
                })
            })
        }
    }

    updateUserMeta(userId, metaKey, metaValue) {
        if(userId) {
            return new Promise((resolve, reject) => {
                this.dbConnection.raw(
                    'Update users_meta set metaValue = ? where userId = ? and metaKey = ?',
                    [metaValue, userId, metaKey]
                )
                .then((result) => {
                    resolve(result)
                }).catch((err) => {
                    logger.error(err)
                    reject(err)
                })
            })
        }
    }

    updateCompanyMeta(companyId, metaKey, metaValue) {
        if(companyId) {
            return new Promise((resolve, reject) => {
                this.dbConnection.raw(
                    'Update companies_meta set metaValue = ? where companyId = ? and metaKey = ?',
                    [metaValue, companyId, metaKey]
                )
                .then((result) => {
                    resolve(result)
                }).catch((err) => {
                    logger.error(err)
                    reject(err)
                })
            })
        }
    }

    checkIfUserExist(email) {
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({
                email
            }).then((res) => {
                resolve(res)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    getRandomIntInclusive() {
        const min = Math.ceil(1000);
        const max = Math.floor(9999);
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    getUserMetaValue(userId, metaKey) {
        return new Promise((resolve, reject) => {
            this.dbConnection.raw(
                'Select metaValue from users_meta where userId = ? and metaKey = ?',
                [userId, metaKey]
            )
            .then((res) => {
                if(res[0].length > 0) {
                    resolve(res[0][0].metaValue)
                } else {
                    resolve('')
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    getCompanyMetaValue(companyId, metaKey) {
        return new Promise((resolve, reject) => {
            this.dbConnection.raw(
                'Select metaValue from companies_meta where companyId = ? and metaKey = ?',
                [companyId, metaKey]
            )
            .then((res) => {
                resolve(res[0][0].metaValue)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    validateToken(userId, token) {
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({
                id: userId
            }).select('token', 'token_issued')
            .then((res) => {
                const tnow = Date.now()
                const tDiff = tnow - parseInt(res[0].token_issued)
                if(tDiff < 43200000) {
                    if(token == res[0].token) {
                        resolve('valid')
                    } else {
                        resolve('invalid token')
                    }
                } else {
                    resolve('expired')
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    validatePasswordByUserId(userId, password) {
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({
                id: userId
            }).select('password')
            .then((res) => {
                if(res.length > 0) {
                    this.comparePassword(password, userId)
                    .then((isValid) => {
                        if(isValid) {
                            resolve('valid')
                        } else {
                            resolve('invalid')
                        }
                    })
                } else {
                    resolve('invalid')
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    verifyAccount(userId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('users')
            .where({ id: userId })
            .update({
                accountStatus: 1
            })
            .then((res) => {
                resolve(res)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    resetToken(userId) {
        return new Promise((resolve, reject) => {
            const token = this.getRandomIntInclusive()
            const token_issued = Date.now()

            this.dbConnection('users')
            .where({ id: userId })
            .update({
                token,
                token_issued
            }).then((res) => {
                resolve({
                    res,
                    token,
                })
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    generateOTP(userId) {
        return new Promise(async (resolve, reject) => {
            try {
                const otp = this.getRandomIntInclusive()
                const otp_issued = Date.now()

                await this.updateUserMeta(userId, 'otp', otp)      
                await this.updateUserMeta(userId, 'otp_issued', otp_issued)

                resolve(otp)
            } catch (error) {
                logger.error(err)
                reject(error)
            }            
        })
    }

    isCompanyAdmin(userId, companyId) {
        return new Promise((resolve, reject) => {
            this.dbConnection.raw(
                'Select role from user_company_role_relationship where userId = ? and company = ?',
                [userId, companyId]
            )
            .then((res) => {
                resolve(res[0][0].role)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    getCompanyIdForUser(userId) {
        return new Promise((resolve, reject) => {
            this.dbConnection.raw(
                'Select company from user_company_role_relationship where userId = ?',
                [userId]
            )
            .then((res) => {
                resolve(res[0][0].company)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    getCompanyRoleForUser(userId, companyId) {
        return new Promise((resolve, reject) => {
            this.dbConnection.raw(
                'Select role from user_company_role_relationship where userId = ? and company = ?',
                [userId, companyId]
            )
            .then((res) => {
                resolve(res[0][0].role)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    getUserDetails(email) {
        return new Promise((resolve, reject) => {
            logger.info('Fetching user details')
            this.dbConnection('users').where({
                email: email
            }).select('*')
            .then((res) => {
                const userId = res[0].id
                let user = {
                    id: res[0].id,
                    firstname: res[0].firstname,
                    lastname: res[0].lastname,
                    email: res[0].email,
                    accountStatus: res[0].accountStatus == 1 ? true : false,
                    mobileNumber: res[0].mobileNumber

                }
                this.getUserMetaDetails(userId)
                .then((metaData) => {
                    if(metaData) {
                        user = {...user, ...metaData}
                    }
                    resolve(user)
                })
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    isUserExist(userId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({
                id: userId
            }).select('*')
            .then((res) => {
                if(res.length > 0) {
                    resolve('exists')
                }
                resolve('not-exists')
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    isCompanyExist(companyId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('companies').where({
                id: companyId
            }).select('*')
            .then((res) => {
                if(res.length > 0) {
                    resolve('exists')
                }
                resolve('not-exists')
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    getCompanyDetails(companyId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('companies').where({
                id: companyId
            }).select('*')
            .then((res) => {
                console.log(res)
                const companyId = res[0].id
                let company = {
                    companyId: res[0].id,
                    phoneNumber: res[0].company_phone,
                    companyName: res[0].company_name,
                    orgType: res[0].company_type

                }
                this.getCompanyMetaDetails(companyId)
                .then((metaData) => {
                    if(metaData) {
                        company = {...company, ...metaData}
                    }
                    resolve(company)
                })
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    getCompanyDetailsByUserId(userId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('companies').where({
                adminId: userId
            }).select('*')
            .then((res) => {
                console.log(res)
                const companyId = res[0].id
                let company = {
                    companyId: res[0].id,
                    phoneNumber: res[0].company_phone,
                    companyName: res[0].company_name,
                    orgType: res[0].company_type

                }
                this.getCompanyMetaDetails(companyId)
                .then((metaData) => {
                    if(metaData) {
                        company = {...company, ...metaData}
                    }
                    resolve(company)
                })
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    getUserDetailsById(userId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({
                id: userId
            }).select('*')
            .then((res) => {
                const userId = res[0].id
                let user = {
                    id: res[0].id,
                    firstname: res[0].firstname,
                    lastname: res[0].lastname,
                    email: res[0].email,
                    accountStatus: res[0].accountStatus == 1 ? true : false,
                    mobileNumber: res[0].mobileNumber

                }
                this.getUserMetaDetails(userId)
                .then((metaData) => {
                    if(metaData) {
                        user = {...user, ...metaData}
                    }
                    resolve(user)
                })
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    getUserMetaDetails(userId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('users_meta')
            .where({ userId: userId })
            .select('*')
            .then((res) => {
                let temp = {}
                res.forEach(element => {
                    temp[element.metaKey] = element.metaValue
                });

                let data = {
                    accountLockStatus: temp['accountLockStatus'] == 1 ? true : false,
                    avatarName: `${process.env.USER_IMAGE_URL}/${temp['profilePic']}`,
                    twoFactorAuth: temp['2FA'] == 1 ? true : false,
                    accountBlocked: temp['accountBlocked'] == 1 ? true : false,
                    accountType: temp['accountType']
                }
                resolve(data)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    getCompanyMetaDetails(companyId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('companies_meta')
            .where({ companyId: companyId })
            .select('*')
            .then((res) => {
                let temp = {}
                res.forEach(element => {
                    temp[element.metaKey] = element.metaValue
                });

                let data = {
                    mailingAddress : {
                        addressLine: temp['mailingAddStreetName'],
                        city: temp['mailingAddCityName'],
                        state: temp['mailingAddState'],
                        postCode: temp['mailingAddZip']
                    },
                    billingAddress : {
                        addressLine: temp['billingAddStreetName'],
                        city: temp['billingAddCityName'],
                        state: temp['billingAddState'],
                        postCode: temp['billingAddZip']
                    },
                    companyLogo: temp['companyLogo'] ? `${process.env.COMPANY_IMAGE_URL}/${temp['companyLogo']}` : null,
                    companytwoFactorAuth: temp['2FA'] == 1 ? true : false,
                    isMailAndBillAddressSame: temp['isMailAndBillAddressSame'] == 1 ? true : false
                }
                resolve(data)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    getCompanyRole(userId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('user_company_role_relationship')
            .where({ userId })
            .select('*')
            .then((roleData) => {
                resolve(roleData[0])
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    getIncorrectOTPAttemptRecord(userId) {
        return new Promise((resolve, reject) => {
            this.getUserMetaValue(userId, 'incorrect_attempt_count')
            .then((count) => resolve(count))
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    isAccountLockedForIncorrectOtpAccount(userId) {
        return new Promise((resolve, reject) => {
            this.getUserMetaValue(userId, 'accountLockStatus')
            .then((status) => {
                if(status == 0) {
                    resolve(0)
                } else {
                    const currentTimestamp = Date.now()
                    this.getUserMetaValue(userId, 'attempt_timestamp')
                    .then((time) => {
                        if(time) {
                            let tDiff = currentTimestamp - parseInt(time)
                            console.log(tDiff)
                            if(tDiff < 43200000) {
                                resolve(1)
                            } else {
                                this.updateUserMeta(userId, 'incorrect_attempt_count', 0)
                                this.updateUserMeta(userId, 'accountLockStatus', 0)
                                resolve(0)
                            }
                        }  
                    })
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    updateIncorrectOTPAttemptRecord (userId) {
        return new Promise((resolve, reject) => {
            const currentTimestamp = Date.now()
            this.getUserMetaValue(userId, 'attempt_timestamp')
            .then((time) => {
                if(time) {
                    let tDiff = currentTimestamp - parseInt(time)
                    if(tDiff < 43200000) {
                        this.getIncorrectOTPAttemptRecord(userId)
                        .then((count) => {
                            let countInt = parseInt(count)
                            countInt += 1
                            if(countInt <= 3) {
                                this.updateUserMeta(userId, 'incorrect_attempt_count', countInt)
                            } else {
                                this.updateUserMeta(userId, 'accountLockStatus', 1)
                            }

                        })
                    } else {
                        this.updateUserMeta(userId, 'incorrect_attempt_count', 1)
                        this.updateUserMeta(userId, 'attempt_timestamp', currentTimestamp)
                    }
                } else {
                    this.updateUserMeta(userId, 'incorrect_attempt_count', 1)
                    this.updateUserMeta(userId, 'attempt_timestamp', currentTimestamp)
                }
                
            })
        })
    }

    validateLoginCredential(email, password) {
        return new Promise((resolve, reject) => {
            this.dbConnection('users').where({
                email: email
            }).select('id', 'password')
            .then((res) => {
                if(res.length > 0) {
                    this.comparePassword(password, res[0].id)
                    .then((isValid) => {
                        if(isValid) {
                            this.isAccountLockedForIncorrectOtpAccount(res[0].id)
                            .then((stat) => {
                                if(stat == 0) {
                                    resolve(
                                        {
                                            stat: 'valid',
                                            userId: res[0].id,
                                        }
                                    )
                                } else {
                                    resolve(
                                        {
                                            stat: 'locked'
                                        }
                                    )
                                }
                            })
                            .catch((err) => {
                                console.log(err)
                                reject(err)
                            })
                        } else {
                            resolve({stat: 'invalid'})
                        }
                    })
                    .catch((err) => {
                        console.log(err)
                        reject(err)
                    })
                } else {
                    resolve({stat: 'invalid'})
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    validateCredentialAndOtp(email, password, otp) {
        return new Promise((resolve, reject) => {
            this.validateLoginCredential(email, password).then((res) => {
                const currentTimestamp = Date.now()
                if(res.stat == 'valid') {
                    this.isAccountLockedForIncorrectOtpAccount(res.userId)
                    .then((stat) => {
                        if(stat == 0) {
                            this.getUserMetaValue(res.userId, 'otp').then((otpInRecord) => {
                                if(otpInRecord == otp) {
                                    this.getUserMetaValue(res.userId, 'otp_issued').then((otpIssuedTime) => {
                                        const tDiff = currentTimestamp - otpIssuedTime
                                        if(tDiff <= 600000) {
                                            resolve('valid')
                                        } else {
                                            resolve('expired')
                                        }
                                    })
                                } else {
                                    this.updateIncorrectOTPAttemptRecord(res.userId)
                                    resolve('Invalid OTP')
                                }
                            })
                        } else {
                            resolve('locked')
                        }
                    })
                } else if(res.stat == 'locked') {
                    resolve('locked')
                } else {
                    resolve('Invalid Credential')
                }
            })
        })
    }

    validatePassword(userId, password) {
        return new Promise((resolve, reject) => {
            this.dbConnection('users')
            .where({ id: userId })
            .select('password')
            .then((res) => {
                this.comparePassword(password, userId)
                .then((isValid) => {
                    if(isValid) {
                        resolve('valid')
                    } else {
                        resolve('invalid')
                    }
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    updatePassword(userId, password) {
        return new Promise((resolve, reject) => {
            this.generateHash(password)
            .then((hashedPassword) => {
                this.dbConnection('users')
                .where({ id: userId })
                .update({ password: hashedPassword })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    reject(err)
                    logger.error(err)
                })
            })
            .catch((err) => {
                reject(err)
                logger.error(err)
            })
        })
    }

    updateEmail(userId, email) {
        return new Promise((resolve, reject) => {
            this.dbConnection('users')
            .where({ id: userId })
            .update({ 
                email,
                accountStatus: 0
            })
            .then((res) => {
                resolve(res)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    isUpdatingSameEmail(userId, newEmail) {
        return new Promise((resolve, reject) => {
            this.dbConnection('users')
            .where({ id: userId })
            .select('email')
            .then((res) => {
                if(res[0].email == newEmail) {
                    resolve('yes')
                } else {
                    resolve('no')
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    isAccountVerified(userId){
        return new Promise((resolve, reject) => {
            this.dbConnection('users')
            .where({ id: userId })
            .select('accountStatus')
            .then((res) => {
                if(res[0].accountStatus == 1) {
                    resolve('verified')
                } else {
                    resolve('not verified')
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    is2FAEnabled(userId) {
        return new Promise((resolve, reject) => {
            this.getUserMetaValue(userId, '2FA')
            .then((res) => {
                if(res == 1) {
                    resolve('enabled')
                } else {
                    resolve('disabled')
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    isCompany2FAEnabled(companyId) {
        return new Promise((resolve, reject) => {
            this.getCompanyMetaValue(companyId, '2FA')
            .then((res) => {
                if(res == 1) {
                    resolve('enabled')
                } else {
                    resolve('disabled')
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    enable2FA(userId) {
        return new Promise((resolve, reject) => {
            this.isAccountVerified(userId)
            .then(async (res) => {
                if(res == 'verified') {
                    await this.updateUserMeta(userId, '2FA', 1)
                    
                    resolve(1)
                } else {
                    resolve(0)
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    disable2FA(userId) {
        return new Promise(async (resolve, reject) => {
            await this.updateUserMeta(userId, '2FA', 0)
            resolve(1)
        })
    }

    enableCompany2FA(companyId, userId) {
        return new Promise((resolve, reject) => {
            this.isAccountVerified(userId)
            .then(async (res) => {
                if(res == 'verified') {
                    await this.updateCompanyMeta(companyId, '2FA', 1)
                    
                    resolve(1)
                } else {
                    resolve(0)
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    disableCompany2FA(companyId) {
        return new Promise(async (resolve, reject) => {
            await this.updateCompanyMeta(companyId, '2FA', 0)
            resolve(1)
        })
    }

    enable2FAForAllCompanyUsers(companyId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('user_company_role_relationship')
            .where({ company: companyId })
            .select('userId')
            .then(async (res) => {
                if(res.length > 0) {
                    await res.forEach(data => {
                        this.isAccountVerified(data.userId)
                        .then(async (res) => {
                            if(res == 'verified') {
                                await this.updateUserMeta(data.userId, '2FA', 1)
                            } 
                        })
                        .catch((err) => {
                            logger.error(err)
                        })
                    });
                    resolve(1)
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    disable2FAForAllCompanyUsers(companyId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('user_company_role_relationship')
            .where({ company: companyId })
            .select('userId')
            .then(async (res) => {
                if(res.length > 0) {
                    res.forEach(data => {
                        this.updateUserMeta(data.userId, '2FA', 0)
                    });
                    resolve(1)
                }
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    getAccountStatistic(userId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('users_meta')
            .where({ userId: userId })
            .select('*')
            .then((res) => {
                let temp = {}
                res.forEach(element => {
                    temp[element.metaKey] = element.metaValue
                });

                let stat = {
                    noOfQueriesMaxLimit: temp['queries_max_limit'],
                    noOfQueriesDone: temp['no_of_queries'],
                    noOfUsersMaxLimit: temp['users_max_limit'],
                    noOfUsers: temp['no_of_users'],
                    storageSizeMaxLimit: temp['storage_size_max_limit'],
                    storageSizeOccupied: temp['file_size']
                }
                resolve(stat)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    addInvitationDetails(
        email,
        senderId,
        role,
        companyId
    ) {
        return new Promise((resolve, reject) => {
            const token = this.getRandomIntInclusive()
            const token_issued = Date.now()
            const dateTime = new Date()

            this.dbConnection('invitations')
            .insert({ 
                sender: senderId,
                company: companyId,
                email,
                role,
                status: 'Pending',
                token,
                token_issued,
                created: dateTime,
                updated: dateTime
             })
             .then((invitationId) => {
                resolve({
                    invitationId,
                    token
                })
             })
             .catch((err) => {
                logger.error(err)
                reject(err)
             })
        })
    }

    getTotalNumberOfPageForInvitationList(limit, companyId) {
        return new Promise((resolve, reject) => {
            this.dbConnection
            .select('*')
            .from('invitations')
            .where({ company: companyId })
            .then((_list) => {
                resolve({
                    totalPageNum: Math.ceil(_list.length / limit),
                    noOfRecords: _list.length
                })
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    getTotalNumberOfPageForFilteredInvitationList(limit, companyId, email) {
        return new Promise((resolve, reject) => {
            this.dbConnection
            .select('*')
            .from('invitations')
            .where({ company: companyId })
            .whereLike('email', `%${email}%`)
            .then((_list) => {
                resolve({
                    totalPageNum: Math.ceil(_list.length / limit),
                    noOfRecords: _list.length
                })
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    getInvitationList(offset, limit, companyId) {
        return new Promise((resolve, reject) => {
            this.dbConnection
            .select('*')
            .from('invitations')
            .where({ company: companyId})
            .limit(limit)
            .offset(offset)
            .then(async (invitationList) => {
                await invitationList.map((invitation) => {
                    invitation.selected = false
                })
                resolve(invitationList)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    searchUser(email, offset, limit, companyId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('invitations')
            .whereLike('email', `%${email}%`)
            .where({ company: companyId})
            .limit(limit)
            .offset(offset)
            .then(async (invitationList) => {
                await invitationList.map((invitation) => {
                    invitation.selected = false
                })
                resolve(invitationList)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    deleteInvitations(invitationIds) {
        return new Promise(async (resolve, reject) => {
            try {
                await invitationIds.map(async (invId) => {
                    await this.dbConnection.raw(
                        'Delete from invitations where id = ?',
                        [invId]
                    )
                })
                resolve(1)
            } catch (error) {
                logger.error(error)
                reject(error)
            }
        })
    }

    deleteInvitation(invitationId) {
        return new Promise((resolve, reject) => {
            try {
                this.dbConnection.raw(
                    'Delete from invitations where id = ?',
                    [invitationId]
                )
                .then((res) => {
                    resolve(1)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
            } catch (error) {
                logger.error(error)
                reject(error)
            }
        })
    }

    getInvitationDetail(email) {
        return new Promise((resolve, reject) => {
            this.dbConnection('invitations')
            .where({email : email})
            .select('*')
            .then((res) => {
                if(res.length > 0) {
                    resolve(res[0])
                } else {
                    resolve(false)
                }
            })
            .catch((err) => {
                logger.error(err)
                console.log(err)
                reject(err)
            })
        })
    }

    isInvitationExist(invitationId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('invitations')
            .where({id : invitationId})
            .select('*')
            .then((res) => {
                if(res.length > 0) {
                    resolve('exists')
                } else {
                    resolve('not-exists')
                }
            })
            .catch((err) => {
                logger.error(err)
                console.log(err)
                reject(err)
            })
        })
    }

    isInvitationSent(email) {
        return new Promise((resolve, reject) => {
            this.dbConnection('invitations')
            .where({email : email})
            .select('*')
            .then((res) => {
                if(res.length > 0) {
                    resolve('yes')
                } else {
                    resolve('no')
                }
            })
            .catch((err) => {
                logger.error(err)
                console.log(err)
                reject(err)
            })
        })
    }

    isPreviousInvitationExpired(email) {
        return new Promise((resolve, reject) => {
            this.dbConnection('invitations')
            .where({ email: email })
            .select('*')
            .then((res) => {
                const tnow = Date.now()
                const tDiff = tnow - parseInt(res[0].token_issued)

                if(tDiff < 600000) {
                    resolve('not-expired')
                } else {
                    resolve('expired')
                }
            })
            .catch((err) => {
                reject(err)
            })
        })
    }

    updateInvitationToken(email) {
        return new Promise((resolve, reject) => {
            const token = this.getRandomIntInclusive()
            const token_issued = Date.now()
            const dateTime = new Date()

            this.dbConnection('invitations')
            .where({ email: email })
            .update({
                status: 'Pending',
                token,
                token_issued,
                created: dateTime,
                updated: dateTime
            }).then((res) => {
                resolve({
                    res,
                    token,
                })
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    updateInvitationStatusAndUserId(status, email, userId) {
        return new Promise((resolve, reject) => {

            this.dbConnection('invitations')
            .where({ email: email })
            .update({
                status,
                userId
            }).then((res) => {
                resolve(res)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    declineInvitation(email) {
        return new Promise((resolve, reject) => {
            this.dbConnection('invitations')
            .where({ email: email })
            .update({
                status: 'Declined'
            }).then((res) => {
                resolve(res)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    userLockAndUnlockOptionForAdmin(userId, status) {
        return new Promise((resolve, reject) => {
            this.updateUserMeta(userId, 'accountLockStatus', status)
            .then((res) => {
                resolve(1)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    blackListAccount(userId) {
        return new Promise((resolve, reject) => {
            this.updateUserMeta(userId, 'accountBlocked', '1')
            .then((res) => {
                resolve(1)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    whiteListAccount(userId) {
        return new Promise((resolve, reject) => {
            this.updateUserMeta(userId, 'accountBlocked', '0')
            .then((res) => {
                resolve(1)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    getCompanyUserCount(companyId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('user_company_role_relationship')
            .where({ company: companyId })
            .then((users) => {
                resolve(users.length)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }
}

module.exports = Users