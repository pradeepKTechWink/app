const express = require('express');
const app = express();
const parser = require('body-parser');
const multer = require('multer');
const usersRoute = require('./app/routes/user');
const communityRoute = require('./app/routes/community')
const documentRoute = require('./app/routes/document')
const chatRoute = require('./app/routes/chat')
const auth = require('./app/middleware/authenticate')
const Users = require('./app/services/Users')
const Documents = require('./app/services/Documents')
const Community = require('./app/services/Community')
const PDFExtractor = require('./app/services/PDFExtractor')
const path = require('path')
const fs = require('fs')
const i18next = require('i18next');
const Backend = require('i18next-fs-backend')
const i18nextMiddleware  = require('i18next-http-middleware')
const dotenv = require('dotenv');
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

const userAvatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/userAvatars')
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
    cb(null, './uploads/companyLogos')
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
    community.getCommunityAlias(req.query.communityId)
    .then((alias) => {
      req.filePath = path.resolve(`${process.env.DOCUMENT_PATH}/${alias}`)
      cb(null, `./documents/${alias}`)
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

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

app.use(parser.urlencoded({ extended: true }));
app.use(parser.json());
app.use('/user-avatars', express.static('uploads/userAvatars'));
app.use('/company-logos', express.static('uploads/companyLogos'));

app.use(usersRoute());
app.use(communityRoute());
app.use(documentRoute());
app.use(chatRoute());

app.post('/user-profile', auth.verifyToken, userAvatarUpload.single('image'), function (request, response) {
  const user = new Users(knex)

  if(request.file) {
      user.getUserMetaValue(request.body.userId, 'profilePic')
      .then((oldImageName) => {
        if(oldImageName && oldImageName != 'default.png') {
          const filePath = `./uploads/userAvatars/${oldImageName}`; 
          fs.unlinkSync(filePath)
        }
      })

      user.updateUser(
        request.body.userId,
        request.body.firstname,
        request.body.lastname,
        request.body.mobileNumber,
        request.fileName ? request.fileName : 'default.png'
      )
      .then((res) => {
          if(res == 1) {
            user.getUserDetailsById(request.body.userId)
              .then((data) => {
                  let userData = data

                  return response.status(200)
                      .send({success: true, message: request.t('userProfileUpdateSuccess'), userData});
              })
          } else {
              return response.status(200)
                      .send({success: false, message: request.t('userProfileUpdateFailed')});
          }
      })
      .catch((err) => {
          console.log(err)
          return response.status(200)
                      .send({success: false, message: request.t('userProfileUpdateFailed')});
      })
  } else {
      user.updateUser(
          request.body.userId,
          request.body.firstname,
          request.body.lastname,
          request.body.mobileNumber,
          ''
      )
      .then((res) => {
          if(res == 1) {
            user.getUserDetailsById(request.body.userId)
            .then((data) => {
                let userData = data

                return response.status(200)
                    .send({success: true, message: request.t('userProfileUpdateSuccess'), userData});
            })
          } else {
              return response.status(200)
                      .send({success: false, message: request.t('userProfileUpdateFailed')});
          }
      })
      .catch((err) => {
          console.log(err)
          return response.status(200)
                      .send({success: false, message: request.t('userProfileUpdateFailed')});
      })
  }
})


app.post('/admin-user-update', auth.verifyToken, auth.adminAccess, userAvatarUpload.single('image'), function (request, response) {
  const user = new Users(knex)

  if(request.file) {
      user.getUserMetaValue(request.body.userId, 'profilePic')
      .then((oldImageName) => {
        if(oldImageName && oldImageName != 'default.png') {
          const filePath = `./uploads/userAvatars/${oldImageName}`; 
          fs.unlinkSync(filePath)
        }
      })

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
            user.adminRoleUpdateForUser(
              request.body.userId,
              request.body.companyId,
              request.body.role
            )
            .then((res) => {
              if(res == 1) {
                user.getUserDetailsById(request.body.userId)
                .then((data) => {
                    let userData = data
                    userData = {...userData, role: request.body.role}

                    return response.status(200)
                        .send({success: true, message: request.t('adminAserProfileUpdateSuccess'), userData});
                })
                .catch((err) => {
                  console.log(err)
                  return response.status(200)
                        .send({success: true, message: request.t('adminAserProfileUpdateSuccessFetchFailed'), userData});
                })
              } else {
                return response.status(200)
                  .send({success: false, message: request.t('adminAserProfileUpdateSuccessRoleFailed'), userData});
              }
            })
            .catch((err) => {
              console.log(err)
              return response.status(200)
                  .send({success: false, message: request.t('adminAserProfileUpdateSuccessRoleFailed'), userData});
            })
          } else {
              return response.status(200)
                      .send({success: false, message: request.t('adminAserProfileUpdateFailed')});
          }
      })
      .catch((err) => {
          console.log(err)
          return response.status(200)
                      .send({success: false, message: request.t('adminAserProfileUpdateFailed')});
      })
  } else {
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
            user.adminRoleUpdateForUser(
              request.body.userId,
              request.body.companyId,
              request.body.role
            )
            .then((res) => {
              if(res == 1) {
                user.getUserDetailsById(request.body.userId)
                .then((data) => {
                    let userData = data
                    userData = {...userData, role: request.body.role}

                    return response.status(200)
                        .send({success: true, message: request.t('adminAserProfileUpdateSuccess'), userData});
                })
                .catch((err) => {
                  console.log(err)
                  return response.status(200)
                        .send({success: true, message: request.t('adminAserProfileUpdateSuccessFetchFailed'), userData});
                })
              } else {
                return response.status(200)
                  .send({success: false, message: request.t('adminAserProfileUpdateSuccessRoleFailed'), userData});
              }
            })
            .catch((err) => {
              console.log(err)
              return response.status(200)
                  .send({success: false, message: request.t('adminAserProfileUpdateSuccessRoleFailed'), userData});
            })
          } else {
              return response.status(200)
                      .send({success: false, message: request.t('adminAserProfileUpdateFailed')});
          }
      })
      .catch((err) => {
          console.log(err)
          return response.status(200)
                      .send({success: false, message: request.t('adminAserProfileUpdateFailed')});
      })
  }
})

app.post('/company-profile', auth.verifyToken, auth.adminAccess, companyLogoUpload.single('image'), function (request, response) {
  const user = new Users(knex)

  if(request.file) {
      user.getCompanyMetaValue(request.body.companyId, 'companyLogo')
      .then((oldImageName) => {
        if(oldImageName && oldImageName != 'default.png') {
          const filePath = `./uploads/companyLogos/${oldImageName}`; 
          fs.unlinkSync(filePath)
        }
      })

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
            user.getCompanyDetails(request.body.companyId)
              .then((data) => {
                  let companyData = data

                  return response.status(200)
                      .send({success: true, message: request.t('companyProfileUpdateSuccess'), companyData});
              })
          } else {
              return response.status(200)
                      .send({success: false, message: request.t('companyProfileUpdateFailed')});
          }
      })
      .catch((err) => {
          console.log(err)
          return response.status(200)
                      .send({success: false, message: request.t('companyProfileUpdateFailed')});
      })
  } else {
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
            user.getCompanyDetails(request.body.companyId)
            .then((data) => {
                let companyData = data

                return response.status(200)
                    .send({success: true, message: request.t('companyProfileUpdateSuccess'), companyData});
            })
          } else {
              return response.status(200)
                      .send({success: false, message: request.t('companyProfileUpdateFailed')});
          }
      })
      .catch((err) => {
          console.log(err)
          return response.status(200)
                      .send({success: false, message: request.t('companyProfileUpdateFailed')});
      })
  }
})

app.post('/upload-document', auth.verifyToken, documentUpload.single('file'), async function (request, response) {
  const documents = new Documents(knex)
  const community = new Community(knex)
  const extractor = new PDFExtractor()

  response.writeHead(200, {
    'Content-Type': 'text/plain; charset=us-ascii',
    'X-Content-Type-Options': 'nosniff'
  });

  if(request.file) {
    documents.checkIfFileExists(request.fileName[0])
    .then(async (res) => {
      if(res == 1) {
        if(fs.existsSync(request.filePath + '/' + request.fileFullName)){
          let docs = []
          if(request.file.mimetype == "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            response.write('1-File uploaded successfully, Analysing the document...$')
            docs = await documents.createDocumentFromDocx(path.join(request.filePath, request.fileFullName))
          } else if(request.file.mimetype == "application/pdf") {
            response.write('1-File uploaded successfully, Extracting the data from PDF...$')
            const textURL = await extractor.convertPDFToText(path.join(request.filePath, request.fileFullName), request.decoded.userId, request.fileName[0])
            docs = await documents.createDocumentFromText(textURL)
            response.write('1-Data extraction successfull, Analysing the document...$')
          } else if(request.file.mimetype == "text/plain") {
            response.write('1-File uploaded successfully, Analysing the document...$')
            docs = await documents.createDocumentFromText(path.join(request.filePath, request.fileFullName))
          } else if(request.file.mimetype == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
            response.write('1-File uploaded successfully, Analysing the document...$')
            let isCsvFileCreated = await documents.createTempCSVFileForXLSXFile(request.filePath, request.fileName, 'xlsx')
            if(isCsvFileCreated == 1) {
              docs = await documents.createDocumentFromCSV(path.join(path.resolve(`${process.env.TMP_CSV_PATH}`), `${request.fileName[0]}.csv`))
            }
          } else if(request.file.mimetype == "application/vnd.ms-excel") {
            response.write('1-File uploaded successfully, Analysing the document...$')
            let isCsvFileCreated = await documents.createTempCSVFileForXLSXFile(request.filePath, request.fileName, 'xls')
            if(isCsvFileCreated == 1) {
              docs = await documents.createDocumentFromCSV(path.join(path.resolve(`${process.env.TMP_CSV_PATH}`), `${request.fileName[0]}.csv`))
            }
          } else if(request.file.mimetype == "application/msword") {
            response.write('1-File uploaded successfully, Analysing the document...$')
            const textFilePath = await documents.extractTextFromDocAndCreateTextFile(path.join(request.filePath, request.fileFullName), request.decoded.userId, request.fileName[0])
            docs = await documents.createDocumentFromText(textFilePath)
          } else if(request.file.mimetype == "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
            response.write('1-File uploaded successfully, Analysing the document...$')
            const textFilePath = await documents.extractTextFromPPTXAndCreateTextFile(path.join(request.filePath, request.fileFullName), request.decoded.userId, request.fileName[0])
            docs = await documents.createDocumentFromText(textFilePath)
          } else {
            response.write('0-File upload failed, Invalid file type$')
            response.end()
          }

          if(docs.length > 0) {
            community.getCommunityAlias(request.query.communityId)
            .then((alias) => {
              console.log(docs)
              documents.createAndStoreEmbeddingsOnIndex(docs, alias)
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
                      // return response.status(201)
                      //     .send({ success: true, message: request.t('fileUploadSuccess') });
                      
                      response.write('1-File uploaded successfully, File analyzed successfully$')
                      response.end()
                    } else {
                      // return response.status(201)
                      //     .send({ success: false, message: request.t('fileUploadFailedAnalyzeSuccess') });
                      response.write('0-File upload failed, File analyzed successfully$')
                      response.end()
                    }
                  } else {
                    // return response.status(201)
                    //       .send({ success: false, message: request.t('fileUploadFailedAnalyzeSuccess') });
                    response.write('0-File upload failed, File analyzed successfully$')
                    response.end()
                  }
                })
                .catch((err) => {
                  console.log(err)
                  // return response.status(201)
                  //   .send({ success: false, message: request.t('fileUploadFailedAnalyzeSuccess') });
                  response.write('0-File upload failed, File analyzed successfully$')
                  response.end()
                })
              })
              .catch((err) => {
                console.log(err)
                // return response.status(201)
                //     .send({ success: false, message: request.t('fileUploadSuccessAnalyzeFailed') });
                response.write('0-File uploaded successfully, Failed to analyze the file$')
                response.end()
              })
            })
            .catch((err) => {
              console.log(err)
              // return response.status(201)
              //       .send({ success: false, message: request.t('fileUploadSuccessAnalyzeFailed') });
              response.write('0-File uploaded successfully, Failed to analyze the file$')
              response.end()
            })
          } else {
            response.write('0-File upload failed, Failed to analyze the file$')
            response.end()
          }
        } else {
          // return response.status(201)
          //     .send({ success: false, message: request.t('fileUploadFailedAnalyzeSuccess') });
          response.write('0-File upload failed, Failed to analyze the file$')
          response.end()
        }
      } else {
        response.write('0-File upload failed, Failed to analyze the file$')
        response.end()
      }
    })
    .catch((err) => {
      console.log(err)
    })
  }
})

app.listen(5050, () => {
  console.log('app is listening on port 5050');
});