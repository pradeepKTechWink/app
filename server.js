const express = require('express');
const app = express();
const parser = require('body-parser');
const multer = require('multer');
const usersRoute = require('./app/routes/user');
const communityRoute = require('./app/routes/community')
const documentRoute = require('./app/routes/document')
const chatRoute = require('./app/routes/chat')
const superAdminRoute = require('./app/routes/superAdmin')
const auth = require('./app/middleware/authenticate')
const Users = require('./app/services/Users')
const Documents = require('./app/services/Documents')
const Community = require('./app/services/Community')
const PDFExtractor = require('./app/services/PDFExtractor')
const { loadDataToRedis } = require('./app/init/redisUtils')
const { emailTransporter } = require('./app/init/emailTransporter')
const path = require('path')
const fs = require('fs')
const i18next = require('i18next');
const Backend = require('i18next-fs-backend')
const i18nextMiddleware  = require('i18next-http-middleware')
const winston = require('winston');
const stripe = require('stripe');
const { combine, timestamp, json } = winston.format;
const dotenv = require('dotenv');
const axios = require('axios')
dotenv.config();

i18next
 .use(Backend)
 .use(i18nextMiddleware.LanguageDetector)
 .init({
    backend: {
      loadPath: __dirname + '/resources/locales/{{lng}}/{{ns}}.json'
    },
    fallbackLng: 'en',
    preload: ['en']
 })

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

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), json()),
  transports: [
    new winston.transports.File({
      filename: process.env.LOG_FILE_PATH,
    }),
  ],
});

const userAvatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, `${process.env.BACKEND_PATH}/uploads/userAvatars`)
  },
  filename: function (req, file, cb) {
    const fileName = req.body.userId + '-' + Math.round(Math.random() * 1E5) + path.extname(file.originalname)
    req.fileName = fileName
    cb(null, fileName)
  }
})

const userAvatarUpload = multer({ storage: userAvatarStorage })

const companyLogosStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, `${process.env.BACKEND_PATH}/uploads/companyLogos`)
  },
  filename: function (req, file, cb) {
    const fileName = req.body.companyId + '-' + Math.round(Math.random() * 1E5) + path.extname(file.originalname)
    req.fileName = fileName
    cb(null, fileName)
  }
})

const companyLogoUpload = multer({ storage: companyLogosStorage })

const documentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const community = new Community(knex)
    const documents = new Documents(knex)
    community.getCommunityUUID(req.query.communityId)
    .then((uuid) => {
      req.filePath = path.resolve(`${process.env.DOCUMENT_PATH}/${uuid}`)
      cb(null, `${process.env.BACKEND_PATH}/documents/${uuid}`)
    })
  },
  filename: function (req, file, cb) {
    const documents = new Documents(knex)
    documents.createFile(file.originalname, req.query.parentId, req.query.communityId)
    .then((fileId) => {
      const fileName = fileId + path.extname(file.originalname)
      req.fileName = fileId
      req.fileFullName = fileName
      cb(null, fileName)
    })
  }
})

const documentUpload = multer({ storage: documentStorage })

app.use(i18nextMiddleware.handle(i18next))

app.post('/stripe/webhook', express.raw({type: 'application/json'}), async (request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_ENDPOINT_SECRET);
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  response.send()

  const metadata = event.data.object.metadata
  const user = new Users(knex)

  if(metadata.registrationType == "nonCompanyRegistration") {
    user.createNewUser(
      metadata.firstname,
      metadata.lastname,
      metadata.email,
      metadata.mobileNumber,
      metadata.password,
      metadata.accountType,
      "1"
    ).then((res) => {
        const { userId, token } = res
        logger.info(`User account creation successful for ${metadata.email}`)
        logger.info(`Creating company account for ${metadata.email}`)
        user.createNewCompany(
            userId,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
        )
        .then(async (res) => {
          user.addSubscriptionData(
            userId,
            event.id,
            'Professional',
            parseInt(event.data.object.amount_total) / 100,
            '1'
          )
          .then(async (res) => {
            var { transporter, mailingAddress } = await emailTransporter()
            
            var mailOptions2 = {
                from: mailingAddress,
                to: metadata.email,
                subject: 'Welcome Aboard',
                template: 'welcome',
                context:{
                    name: metadata.firstname
                }
            };

            transporter.sendMail(mailOptions2, function(error, info){
                if(error){
                    logger.error(error.message)
                }
                logger.info(`Welcome message successfully sent to ${metadata.email}`)
            });

            var mailOptions = {
                from: mailingAddress,
                to: metadata.email,
                subject: 'Account Verification',
                template: 'email',
                context:{
                    name: metadata.firstname,
                    link: `${process.env.FRONTEND_BASE_URL}/verify-account?id=${userId}&token=${token}`
                }
            };

            transporter.sendMail(mailOptions, function(error, info){
                if(error){
                    logger.error(error.message)
                }
                logger.info(`Verification email successfully sent to ${metadata.email}`)
            });
            logger.info(`Company account creation successful for ${metadata.email}`)
          })
          .catch((err) => {
            logger.warn(`Failed to add subscription data for ${metadata.email}`)
            logger.error(err)
            logger.debug(JSON.stringify( { success: false, message: request.t('accountCreationFailed') } ))
          })
        })
        .catch((err) => {
            logger.warn(`Company account creation failed for ${metadata.email}`)
            logger.error(err)
            logger.debug(JSON.stringify( { success: false, message: request.t('accountCreationFailed') } ))
        })
    })
    .catch((err) => {
        logger.warn(`User account creation failed for ${metadata.email}`)
        logger.error(err)
        logger.debug(JSON.stringify( {success: false, message: err} ))
    })
  } else if(metadata.registrationType == "googleNonCompanyRegistration") {
    logger.info(`Creating new account for ${metadata.email}`)
    logger.info(`Uploading Image for ${metadata.email}`)

    const imageResponse = await axios.get(metadata.profilePic, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data, 'binary');

    const fileName = `${metadata.firstname}_${Date.now()}.jpg`;

    fs.writeFileSync(`${process.env.BACKEND_PATH}/uploads/userAvatars/${fileName}`, imageBuffer);

    logger.info(`Image upload successful for ${metadata.email}`)
    logger.info(`Creating user account for ${metadata.email}`)

    user.createNewUserGoogle(
        metadata.firstname,
        metadata.lastname,
        metadata.email,
        fileName,
        metadata.accountType
    ).then(async (res) => {
      const { userId } = res
      logger.info(`User account creation successful for ${metadata.email}`)

      logger.info(`User account creation successful for ${metadata.email}`)
      logger.info(`Creating company account for ${metadata.email}`)
      user.createNewCompany(
          userId,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null
      )
      .then(async (res) => {
        user.addSubscriptionData(
          userId,
          event.id,
          'Professional',
          parseInt(event.data.object.amount_total) / 100,
          '1'
        )
        .then(async (res) => {
          var { transporter, mailingAddress } = await emailTransporter()
          
          var mailOptions2 = {
              from: mailingAddress,
              to: metadata.email,
              subject: 'Welcome Aboard',
              template: 'welcome',
              context:{
                  name: metadata.firstname
              }
          };

          transporter.sendMail(mailOptions2, function(error, info){
              if(error){
                  logger.error(error.message)
              }
              logger.info(`Welcome message successfully sent to ${metadata.email}`)
          });
          logger.info(`Company account creation successful for ${metadata.email}`)
        })
        .catch((err) => {
          logger.warn(`Failed to add subscription data for ${metadata.email}`)
          logger.error(err)
          logger.debug(JSON.stringify( { success: false, message: request.t('accountCreationFailed') } ))
        })
      })
      .catch((err) => {
          logger.warn(`Company account creation failed for ${metadata.email}`)
          logger.error(err)
          logger.debug(JSON.stringify( { success: false, message: request.t('accountCreationFailed') } ))
      })
    })
    .catch((err) => {
        console.log(err)
        logger.warn(`User account creation failed for ${metadata.email}`)
        logger.error(err)
        logger.debug(JSON.stringify({ success: false, message: err }))
    })
  } else if(metadata.registrationType == "googleCompanyRegistration") {
    logger.info(`Uploading Image for ${metadata.email}`)

    const imageResponse = await axios.get(metadata.profilePic, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data, 'binary');

    const fileName = `${metadata.firstname}_${Date.now()}.jpg`;

    fs.writeFileSync(`${process.env.BACKEND_PATH}/uploads/userAvatars/${fileName}`, imageBuffer);

    logger.info(`Image upload successful for ${metadata.email}`)
    logger.info(`Creating user account for ${metadata.email}`)

    user.createNewUserGoogle(
        metadata.firstname,
        metadata.lastname,
        metadata.email,
        fileName,
        metadata.accountType
    ).then((res) => {
        const { userId } = res
        logger.info(`User account creation successful for ${metadata.email}`)
        logger.info(`Creating company account for ${metadata.email}`)
        user.createNewCompany(
            userId,
            metadata.companyName,
            metadata.phoneNumber,
            metadata.orgType,
            metadata.mailingAddStreetName,
            metadata.mailingAddCityName,
            metadata.mailingAddStateName,
            metadata.mailingAddZip,
            metadata.billingAddStreetName,
            metadata.billingAddCityName,
            metadata.billingAddStateName,
            metadata.billingAddZip,
            metadata.isMailAndBillAddressSame
        )
        .then((res) => {
          user.addSubscriptionData(
            userId,
            event.id,
            'Professional',
            parseInt(event.data.object.amount_total) / 100,
            '1'
          )
          .then(async (res) => {
            var { transporter, mailingAddress } = await emailTransporter()

            var mailOptions2 = {
                from: mailingAddress,
                to: metadata.email,
                subject: 'Welcome Aboard',
                template: 'welcome',
                context: {
                    name: metadata.firstname
                }
            };

            transporter.sendMail(mailOptions2, function (error, info) {
                if (error) {
                    logger.error(error.message)
                    return
                }
                logger.info(`Welcome message successfully sent to ${metadata.email}`)
            });

            logger.debug(JSON.stringify({ success: true, message: request.t('accountCreationSuccess'), userData: data }))
          })
          .catch((err) => {
              logger.warn(`Company account creation failed for ${metadata.email}`)
              logger.error(err)
              logger.debug(JSON.stringify({ success: false, message: request.t('accountCreationFailed') }))
          })
        })
        .catch((err) => {
          logger.warn(`User account creation failed for ${metadata.email}`)
          logger.error(err)
          logger.debug(JSON.stringify({ success: false, message: err }))
        })
    })
    .catch((err) => {
      logger.warn(`User account creation failed for ${metadata.email}`)
      logger.error(err)
      logger.debug(JSON.stringify({ success: false, message: err }))
    })
  } else {
    user.createNewUser(
      metadata.firstname,
      metadata.lastname,
      metadata.email,
      metadata.mobileNumber,
      metadata.password,
      metadata.accountType,
      "1"
    ).then((res) => {

        const { userId, token } = res
        logger.info(`User account creation successful for ${metadata.email}`)
        logger.info(`Creating company account for ${metadata.email}`)
        user.createNewCompany(
            userId,
            metadata.companyName,
            metadata.phoneNumber,
            metadata.orgType,
            metadata.mailingAddStreetName,
            metadata.mailingAddCityName,
            metadata.mailingAddStateName,
            metadata.mailingAddZip,
            metadata.billingAddStreetName,
            metadata.billingAddCityName,
            metadata.billingAddStateName,
            metadata.billingAddZip,
            metadata.isMailAndBillAddressSame
        )
        .then(async (res) => {
          user.addSubscriptionData(
            userId,
            event.id,
            'Professional',
            parseInt(event.data.object.amount_total) / 100,
            '1'
          )
          .then(async (res) => {
            var { transporter, mailingAddress } = await emailTransporter()
            
            var mailOptions2 = {
                from: mailingAddress,
                to: metadata.email,
                subject: 'Welcome Aboard',
                template: 'welcome',
                context:{
                    name: metadata.firstname
                }
            };

            transporter.sendMail(mailOptions2, function(error, info){
                if(error){
                    logger.error(error.message)
                    console.log(error)
                }
                console.log(`Message sent ${info}`)
                logger.info(`Welcome message successfully sent to ${metadata.email}`)
            });

            var mailOptions = {
                from: mailingAddress,
                to: metadata.email,
                subject: 'Account Verification',
                template: 'email',
                context:{
                    name: metadata.firstname,
                    link: `${process.env.FRONTEND_BASE_URL}/verify-account?id=${userId}&token=${token}`
                }
            };

            transporter.sendMail(mailOptions, function(error, info){
                if(error){
                  console.log(error)
                    logger.error(error.message)
                }
                console.log(`Message sent ${info}`)
                logger.info(`Verification email successfully sent to ${metadata.email}`)
            });
            logger.info(`Company account creation successful for ${metadata.email}`)
          })
          .catch((err) => {
            logger.warn(`Failed to add subscription data for ${metadata.email}`)
            logger.error(err)
            logger.debug(JSON.stringify( { success: false, message: request.t('accountCreationFailed') } ))
          })
        })
        .catch((err) => {
            logger.warn(`Company account creation failed for ${metadata.email}`)
            logger.error(err)
            logger.debug(JSON.stringify( { success: false, message: request.t('accountCreationFailed') } ))
        })
    })
    .catch((err) => {
        logger.warn(`User account creation failed for ${metadata.email}`)
        logger.error(err)
        logger.debug(JSON.stringify( {success: false, message: err} ))
    })
  }
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

app.use(parser.urlencoded({ extended: true }));
app.use(parser.json());
app.use('/user-avatars', express.static(`${process.env.BACKEND_PATH}/uploads/userAvatars`));
app.use('/company-logos', express.static(`${process.env.BACKEND_PATH}/uploads/companyLogos`));

app.use(usersRoute());
app.use(communityRoute());
app.use(documentRoute());
app.use(chatRoute());
app.use(superAdminRoute());

// Google authentication
const session = require('express-session');
const responseGoogle = require('./app/init/responseGoogle');
const cors = require('cors');

app.use(cors())

app.use(session({ secret: process.env.TOKEN_SECRET, resave: true, saveUninitialized: true }));
app.use(responseGoogle.initialize());
app.use(responseGoogle.session());

app.get('/auth/google', responseGoogle.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  responseGoogle.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    const googleData = {
      accessToken: req.user.accessToken,
      refreshToken: req.user.refreshToken,
      profile: req.user.profile,
    };
    res.send(`
      <script>
        const targetOrigin = '${process.env.FRONTEND_BASE_URL}';
        window.opener.postMessage(${JSON.stringify(googleData)}, targetOrigin);
        window.close();
      </script>
    `);
  }
);

app.post('/profile/update', auth.verifyToken, userAvatarUpload.single('image'), auth.userExists, auth.isSenderOwner, function (request, response) {
  const user = new Users(knex)

  if(
    request.body.userId &&
    request.body.firstname &&
    request.body.lastname &&
    request.body.mobileNumber
  ) {
    logger.info(`Updating profile for user Id ${request.body.userId}`)
    if(request.file) {
        logger.info(`Update request include new profile picture`)
        logger.info(`Deleting old profile picture`)
        user.getUserMetaValue(request.body.userId, 'profilePic')
        .then((oldImageName) => {
          if(oldImageName && oldImageName != 'default.png') {
            const filePath = `${process.env.BACKEND_PATH}/uploads/userAvatars/${oldImageName}`; 
            fs.unlinkSync(filePath)
          }
        })
        logger.info(`Old profile picture deleted successfully`)
        user.updateUser(
          request.body.userId,
          request.body.firstname,
          request.body.lastname,
          request.body.mobileNumber,
          request.fileName ? request.fileName : 'default.png'
        )
        .then((res) => {
            if(res == 1) {
              logger.info(`Profile updated successfully`)
              logger.info(`Fetching updated user details for user ${request.body.userId}`)
              user.getUserDetailsById(request.body.userId)
                .then((data) => {
                    logger.info(`Updated user data fetched successfully`)
                    let userData = data

                    logger.debug(JSON.stringify( {success: true, message: request.t('userProfileUpdateSuccess'), userData} ))
                    return response.status(200)
                        .send({success: true, message: request.t('userProfileUpdateSuccess'), userData});
                })
            } else {
                logger.warn(`Failed to fetch updated user details`)
                logger.debug(JSON.stringify( {success: false, message: request.t('userProfileUpdateFailed')} ))
                return response.status(200)
                        .send({success: false, message: request.t('userProfileUpdateFailed')});
            }
        })
        .catch((err) => {
            console.log(err)
            logger.warn(`Profile updated failed for ${request.body.userId}`)
            logger.error(err)
            logger.debug(JSON.stringify( {success: false, message: request.t('userProfileUpdateFailed')} ))
            return response.status(200)
                        .send({success: false, message: request.t('userProfileUpdateFailed')});
        })
    } else {
        logger.info(`Update request does not contain profile picture`)
        user.updateUser(
            request.body.userId,
            request.body.firstname,
            request.body.lastname,
            request.body.mobileNumber,
            ''
        )
        .then((res) => {
            if(res == 1) {
              logger.info(`Profile updated successfully`)
              logger.info(`Fetching updated user details for user ${request.body.userId}`)
              user.getUserDetailsById(request.body.userId)
              .then((data) => {
                  logger.info(`Updated user data fetched successfully`)
                  let userData = data

                  logger.debug(JSON.stringify( {success: true, message: request.t('userProfileUpdateSuccess'), userData} ))
                  return response.status(200)
                      .send({success: true, message: request.t('userProfileUpdateSuccess'), userData});
              })
            } else {
                logger.warn(`Failed to fetch updated user details`)
                logger.debug(JSON.stringify( {success: false, message: request.t('userProfileUpdateFailed')} ))
                return response.status(200)
                        .send({success: false, message: request.t('userProfileUpdateFailed')});
            }
        })
        .catch((err) => {
            console.log(err)
            logger.warn(`Profile updated failed for ${request.body.userId}`)
            logger.error(err)
            logger.debug(JSON.stringify( {success: false, message: request.t('userProfileUpdateFailed')} ))
            return response.status(200)
                        .send({success: false, message: request.t('userProfileUpdateFailed')});
        })
    }
  } else {
    logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
    return response.status(400)
    .send({success: false, message: "Missing parameters, fill all the required fields"});
  }
})


app.post('/admin/update-profile', auth.verifyToken, auth.adminAccess, userAvatarUpload.single('image'), auth.userExists, auth.companyExist, auth.isUserBelongsToCompany, auth.isCompanyUser, auth.hasUserEditAccess, auth.isValidRole, function (request, response) {
  const user = new Users(knex)

  if(
    request.body.userId &&
    request.body.firstname &&
    request.body.lastname &&
    request.body.email &&
    request.body.mobileNumber &&
    request.body.companyId &&
    request.body.role
  ) {
    logger.info(`Updating profile for user Id ${request.body.userId} by admin`)
    if(request.file) {
        logger.info(`Update request include new profile picture`)
        logger.info(`Deleting old profile picture`)
        user.getUserMetaValue(request.body.userId, 'profilePic')
        .then((oldImageName) => {
          if(oldImageName && oldImageName != 'default.png') {
            const filePath = `${process.env.BACKEND_PATH}/uploads/userAvatars/${oldImageName}`; 
            fs.unlinkSync(filePath)
          }
        })
        logger.info(`Old profile picture deleted successfully`)
        user.adminUserUpdate(
            request.body.userId,
            request.body.firstname,
            request.body.lastname,
            request.body.email,
            request.body.mobileNumber,
            request.fileName ? request.fileName : 'default.png'
        )
        .then((res) => {
            if(res == 1) {
              logger.info(`Profile updated successfully by admin`)
              logger.info(`Updating user role`)
              user.adminRoleUpdateForUser(
                request.body.userId,
                request.body.companyId,
                request.body.role
              )
              .then((res) => {
                if(res == 1) {
                  logger.info(`User role updated successfully`)
                  logger.info(`Fetching updated user details for user ${request.body.userId}`)
                  user.getUserDetailsById(request.body.userId)
                  .then((data) => {
                      logger.info(`Updated user data fetched successfully`)
                      let userData = data
                      userData = {...userData, role: request.body.role}

                      logger.debug(JSON.stringify( {success: true, message: request.t('adminAserProfileUpdateSuccess'), userData} ))
                      return response.status(200)
                          .send({success: true, message: request.t('adminAserProfileUpdateSuccess'), userData});
                  })
                  .catch((err) => {
                    console.log(err)
                    logger.warn(`Failed to fetch updated user details`)
                    logger.error(err)
                    logger.debug(JSON.stringify( {success: true, message: request.t('adminAserProfileUpdateSuccessFetchFailed'), userData} ))
                    return response.status(200)
                          .send({success: true, message: request.t('adminAserProfileUpdateSuccessFetchFailed'), userData});
                  })
                } else {
                  logger.warn(`Failed to update role by admin`)
                  logger.debug(JSON.stringify( {success: false, message: request.t('adminAserProfileUpdateSuccessRoleFailed'), userData} ))
                  return response.status(200)
                    .send({success: false, message: request.t('adminAserProfileUpdateSuccessRoleFailed'), userData});
                }
              })
              .catch((err) => {
                console.log(err)
                logger.warn(`Failed to update role by admin`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('adminAserProfileUpdateSuccessRoleFailed'), userData} ))
                return response.status(200)
                    .send({success: false, message: request.t('adminAserProfileUpdateSuccessRoleFailed'), userData});
              })
            } else {
                logger.warn(`Profile update by admin failed`)
                logger.debug(JSON.stringify( {success: false, message: request.t('adminAserProfileUpdateFailed')} ))
                return response.status(200)
                        .send({success: false, message: request.t('adminAserProfileUpdateFailed')});
            }
        })
        .catch((err) => {
            console.log(err)
            logger.warn(`Profile update by admin failed`)
            logger.error(err)
            logger.debug(JSON.stringify( {success: false, message: request.t('adminAserProfileUpdateFailed')} ))
            return response.status(200)
                        .send({success: false, message: request.t('adminAserProfileUpdateFailed')});
        })
    } else {
        logger.info(`Update request does not contain profile picture`)
        user.adminUserUpdate(
            request.body.userId,
            request.body.firstname,
            request.body.lastname,
            request.body.email,
            request.body.mobileNumber,
            ''
        )
        .then((res) => {
            if(res == 1) {
              logger.info(`Profile updated successfully by admin`)
              logger.info(`Updating user role`)
              user.adminRoleUpdateForUser(
                request.body.userId,
                request.body.companyId,
                request.body.role
              )
              .then((res) => {
                if(res == 1) {
                  logger.info(`User role updated successfully`)
                  logger.info(`Fetching updated user details for user ${request.body.userId}`)
                  user.getUserDetailsById(request.body.userId)
                  .then((data) => {
                      logger.info(`Updated user data fetched successfully`)
                      let userData = data
                      userData = {...userData, role: request.body.role}

                      logger.debug(JSON.stringify( {success: true, message: request.t('adminAserProfileUpdateSuccess'), userData} ))
                      return response.status(200)
                          .send({success: true, message: request.t('adminAserProfileUpdateSuccess'), userData});
                  })
                  .catch((err) => {
                    console.log(err)
                    logger.warn(`Failed to fetch updated user details`)
                    logger.error(err)
                    logger.debug(JSON.stringify( {success: true, message: request.t('adminAserProfileUpdateSuccessFetchFailed'), userData} ))
                    return response.status(200)
                          .send({success: true, message: request.t('adminAserProfileUpdateSuccessFetchFailed'), userData});
                  })
                } else {
                  logger.warn(`Failed to update role by admin`)
                  logger.debug(JSON.stringify( {success: false, message: request.t('adminAserProfileUpdateSuccessRoleFailed'), userData} ))
                  return response.status(200)
                    .send({success: false, message: request.t('adminAserProfileUpdateSuccessRoleFailed'), userData});
                }
              })
              .catch((err) => {
                console.log(err)
                logger.warn(`Failed to update role by admin`)
                logger.error(err)
                logger.debug(JSON.stringify( {success: false, message: request.t('adminAserProfileUpdateSuccessRoleFailed'), userData} ))
                return response.status(200)
                    .send({success: false, message: request.t('adminAserProfileUpdateSuccessRoleFailed'), userData});
              })
            } else {
                logger.warn(`Profile update by admin failed`)
                logger.debug(JSON.stringify( {success: false, message: request.t('adminAserProfileUpdateFailed')} ))
                return response.status(200)
                        .send({success: false, message: request.t('adminAserProfileUpdateFailed')});
            }
        })
        .catch((err) => {
            console.log(err)
            logger.warn(`Profile update by admin failed`)
            logger.error(err)
            logger.debug(JSON.stringify( {success: false, message: request.t('adminAserProfileUpdateFailed')} ))
            return response.status(200)
                        .send({success: false, message: request.t('adminAserProfileUpdateFailed')});
        })
    }
  } else {
    logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
    return response.status(400)
    .send({success: false, message: "Missing parameters, fill all the required fields"});
  }
})

app.post('/company/update-profile', auth.verifyToken, auth.adminAccess, companyLogoUpload.single('image'), auth.companyExist, auth.isCompanyUser, function (request, response) {
  const user = new Users(knex)

  if(
    request.body.companyId &&
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
    request.body.isMailAndBillAddressSame
  ) {
    logger.info(`Updating company profile for id ${request.body.companyId}`)
    if(request.file) {
        logger.info(`Update request contain company profile picture`)
        logger.info(`Deleting old profile picture`)
        user.getCompanyMetaValue(request.body.companyId, 'companyLogo')
        .then((oldImageName) => {
          if(oldImageName && oldImageName != 'default.png') {
            const filePath = `${process.env.BACKEND_PATH}/uploads/companyLogos/${oldImageName}`; 
            fs.unlinkSync(filePath)
          }
        })
        logger.info(`Old profile picture deleted successfully`)
        user.updateCompany(
          request.body.companyId,
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
          request.fileName ? request.fileName : 'default.png'
        )
        .then((res) => {
            if(res == 1) {
              logger.info(`Company profile updated successfully`)
              logger.info(`Fetching updated company details`)
              user.getCompanyDetails(request.body.companyId)
                .then((data) => {
                    logger.info(`Updated company details fetched successfully`)
                    let companyData = data

                    logger.debug(JSON.stringify( {success: true, message: request.t('companyProfileUpdateSuccess'), companyData} ))
                    return response.status(200)
                        .send({success: true, message: request.t('companyProfileUpdateSuccess'), companyData});
                })
            } else {
                logger.warn(`Company profile update failed `)
                logger.debug(JSON.stringify( {success: false, message: request.t('companyProfileUpdateFailed')} ))
                return response.status(200)
                        .send({success: false, message: request.t('companyProfileUpdateFailed')});
            }
        })
        .catch((err) => {
            logger.warn(`Company profile update failed `)
            logger.error(err)
            console.log(err)
            logger.debug(JSON.stringify( {success: false, message: request.t('companyProfileUpdateFailed')} ))
            return response.status(200)
                        .send({success: false, message: request.t('companyProfileUpdateFailed')});
        })
    } else {
        logger.info(`Update request does not contain profile picture`)
        user.updateCompany(
            request.body.companyId,
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
            ''
        )
        .then((res) => {
            if(res == 1) {
              logger.info(`Company profile updated successfully`)
              logger.info(`Fetching updated company details`)
              user.getCompanyDetails(request.body.companyId)
              .then((data) => {
                  logger.info(`Updated company details fetched successfully`)
                  let companyData = data

                  logger.debug(JSON.stringify( {success: true, message: request.t('companyProfileUpdateSuccess'), companyData} ))
                  return response.status(200)
                      .send({success: true, message: request.t('companyProfileUpdateSuccess'), companyData});
              })
            } else {
                logger.warn(`Company profile update failed `)
                logger.debug(JSON.stringify( {success: false, message: request.t('companyProfileUpdateFailed')} ))
                return response.status(200)
                        .send({success: false, message: request.t('companyProfileUpdateFailed')});
            }
        })
        .catch((err) => {
            console.log(err)
            logger.warn(`Company profile update failed `)
            logger.error(err)
            logger.debug(JSON.stringify( {success: false, message: request.t('companyProfileUpdateFailed')} ))
            return response.status(200)
                        .send({success: false, message: request.t('companyProfileUpdateFailed')});
        })
    }
  } else {
    logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
    return response.status(400)
    .send({success: false, message: "Missing parameters, fill all the required fields"});
  }
})

app.post('/file-manager/upload-file', auth.verifyToken, auth.checkForDuplicateFile, auth.onlyAdminOrUser, auth.isMemberOfCommunityV2, documentUpload.single('file'), async function (request, response) {
  const documents = new Documents(knex)
  const community = new Community(knex)
  const extractor = new PDFExtractor()

  logger.info(`Uploading new document on community Id ${request.query.communityId}`)
  response.writeHead(200, {
    'Content-Type': 'text/plain; charset=us-ascii',
    'X-Content-Type-Options': 'nosniff'
  });

  if(request.file) {
    logger.info(`Checking if the file uploaded on server`)
    documents.checkIfFileExists(request.fileName[0])
    .then(async (res) => {
      if(res == 1) {
        if(fs.existsSync(request.filePath + '/' + request.fileFullName)){
          logger.info(`File uploaded seuccessfully, splitting the document into chunks`)
          let docs = []
          if(request.file.mimetype == "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            response.write('1&%&File uploaded successfully, Analysing the document...$')
            docs = await documents.createDocumentFromDocx(path.join(request.filePath, request.fileFullName), request.fileName[0], request.file.originalname)
          } else if(request.file.mimetype == "application/pdf") {
            docs = await documents.createDocumentFromPDF(path.join(request.filePath, request.fileFullName), request.fileName[0], request.file.originalname)

            if(docs.length > 0) {
              response.write('1&%&File uploaded successfully, Extracting the data from PDF...$')
            } else {
              response.write('1&%&File uploaded successfully, Extracting the data from PDF...$')
              const textURL = await extractor.convertPDFToText(path.join(request.filePath, request.fileFullName), request.decoded.userId, request.fileName[0])
              docs = await documents.createDocumentFromText(textURL, request.fileName[0], request.file.originalname)
              response.write('1&%&Data extraction successfull, Analysing the document...$')
            }
          } else if(request.file.mimetype == "text/plain") {
            response.write('1&%&File uploaded successfully, Analysing the document...$')
            docs = await documents.createDocumentFromText(path.join(request.filePath, request.fileFullName), request.fileName[0], request.file.originalname)
          } else if(request.file.mimetype == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
            response.write('1&%&File uploaded successfully, Analysing the document...$')
            let isCsvFileCreated = await documents.createTempCSVFileForXLSXFile(request.filePath, request.fileName, 'xlsx')
            if(isCsvFileCreated == 1) {
              docs = await documents.createDocumentFromCSV(path.join(path.resolve(`${process.env.TMP_CSV_PATH}`), `${request.fileName[0]}.csv`), request.fileName[0], request.file.originalname)
            }
          } else if(request.file.mimetype == "application/vnd.ms-excel") {
            response.write('1&%&File uploaded successfully, Analysing the document...$')
            let isCsvFileCreated = await documents.createTempCSVFileForXLSXFile(request.filePath, request.fileName, 'xls')
            if(isCsvFileCreated == 1) {
              docs = await documents.createDocumentFromCSV(path.join(path.resolve(`${process.env.TMP_CSV_PATH}`), `${request.fileName[0]}.csv`), request.fileName[0], request.file.originalname)
            }
          } else if(request.file.mimetype == "application/msword") {
            response.write('1&%&File uploaded successfully, Analysing the document...$')
            const textFilePath = await documents.extractTextFromDocAndCreateTextFile(path.join(request.filePath, request.fileFullName), request.decoded.userId, request.fileName[0])
            docs = await documents.createDocumentFromText(textFilePath, request.fileName[0], request.file.originalname)
          } else if(request.file.mimetype == "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
            response.write('1&%&File uploaded successfully, Analysing the document...$')
            const textFilePath = await documents.extractTextFromPPTXAndCreateTextFile(path.join(request.filePath, request.fileFullName), request.decoded.userId, request.fileName[0])
            docs = await documents.createDocumentFromText(textFilePath, request.fileName[0], request.file.originalname)
          } else {
            response.write('0&%&File upload failed, Invalid file type$')
            response.end()
          }

          if(docs.length > 0) {
            logger.info(`Document split successfully`)
            logger.info(`Creating and storing embeddings on vector database`)
            community.getCommunityUUID(request.query.communityId)
            .then((uuid) => {
              documents.createAndStoreEmbeddingsOnIndex(docs, uuid)
              .then((res) => {
                documents.checkIfFileExists(request.fileName[0])
                .then((res) => {
                  if(res == 1) {
                    if(fs.existsSync(request.filePath + '/' + request.fileFullName)){
                      if(
                        request.file.mimetype == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                        request.file.mimetype == "application/vnd.ms-excel"
                      ) {
                        documents.removeTempCSVFile(request.fileName[0])
                      } 
                      if(request.file.mimetype == "application/pdf") {
                        extractor.clearTempFiles(request.decoded.userId)
                      }
                      if(
                        request.file.mimetype == "application/msword" || 
                        request.file.mimetype == "application/vnd.openxmlformats-officedocument.presentationml.presentation"
                      ) {
                        documents.deleteTempTextFile(request.decoded.userId)
                      }
                      
                      logger.info(`Embeddings created and stored on vector database`)
                      response.write('1&%&File uploaded successfully, File analyzed successfully$')
                      response.end()
                    } else {
                      logger.warn(`Failed to create embeddings`)
                      response.write('0&%&File upload failed, File analyzed successfully$')
                      response.end()
                    }
                  } else {
                    logger.warn(`Failed to create embeddings`)
                    response.write('0&%&File upload failed, File analyzed successfully$')
                    response.end()
                  }
                })
                .catch((err) => {
                  console.log(err)
                  logger.warn(`Failed to create embeddings`)
                  logger.error(err)
                  response.write('0&%&File upload failed, File analyzed successfully$')
                  response.end()
                })
              })
              .catch((err) => {
                console.log(err)
                logger.warn(`Failed to create embeddings`)
                logger.error(err)
                response.write('0&%&File uploaded successfully, Failed to analyze the file$')
                response.end()
              })
            })
            .catch((err) => {
              console.log(err)
              logger.warn(`Failed to create embeddings`)
              logger.error(err)
              response.write('0&%&File uploaded successfully, Failed to analyze the file$')
              response.end()
            })
          } else {
            logger.warn(`File upload failed`)
            response.write('0&%&File upload failed, Failed to analyze the file$')
            response.end()
          }
        } else {
          logger.warn(`File upload failed`)
          response.write('0&%&File upload failed, Failed to analyze the file$')
          response.end()
        }
      } else {
        logger.warn(`File upload failed, unable to find the file on server`)
        response.write('0&%&File upload failed, Failed to analyze the file$')
        response.end()
      }
    })
    .catch((err) => {
      console.log(err)
      logger.warn(`File upload failed, unable to find the file on server`)
      logger.error(err)
      response.write('0&%&File upload failed, Failed to analyze the file$')
      response.end()
    })
  }
})

const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUI = require("swagger-ui-express")
const opt = require("./docs.json")

const swaggerOptions = {
    swaggerDefinition:  opt,
    apis: ["./server.js"]
}

const options = {
    explorer: true,
}

const swaggerDocs = swaggerJsDoc(swaggerOptions)

app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerDocs, options))


app.listen(5050, async () => {
    if(process.env.CACHE_MODE == 'enabled') {
      console.log('Enabling caching')
      await loadDataToRedis()
    }
    console.log('app is listening on port 5050');
});