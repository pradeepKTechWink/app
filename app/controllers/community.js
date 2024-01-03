var jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Community = require('../services/Community')
const Documents = require('../services/Documents')
const winston = require('winston');
const { combine, timestamp, json } = winston.format;
const i18n =  require('../i18n.config');
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

class CommunityController {
    static createNewCommunity(request, response) {
        const community = new Community(knex)
        const documents = new Documents(knex)

        if(
          request.body.communityName &&
          request.body.communityAlias &&
          request.body.creator &&
          request.body.companyId &&
          request.body.limit
        ) {
          request.body.offset = request.body.offset ? request.body.offset : 0
          logger.info(`Creating community for company Id ${request.body.companyId} by user ${request.body.creator}`)
          community.createCommunity(
              request.body.communityName,
              request.body.communityAlias,
              request.body.creator,
              request.body.companyId
          )
          .then((communityData) => {
              logger.info(`Community created with Id ${communityData.communityId}`)
              documents.createCommunityFolder(communityData.uuid)
              documents.createFolder("Financial", 'tooltip', true, 4, communityData.communityId,)
              documents.createFolder("Meetings", 'tooltip', true, 4, communityData.communityId)
              documents.createFolder("Governing & Legal", 'tooltip', true, 4, communityData.communityId)
              documents.createFolder("Community", 'tooltip', true, 4, communityData.communityId)

              logger.info(`Fetching updated community list for company ${request.body.companyId}`)
              community.getCommunityList(
                request.body.offset,
                request.body.limit,
                request.body.companyId
              )
              .then((newCommunityList) => {
                community.getTotalNumberOfPageForCommunityList(request.body.limit, request.body.companyId)
                .then((recordCounts) => {
                  const {totalPageNum, noOfRecords} = recordCounts

                  community.getActiveCommunityList(request.body.companyId)
                  .then((activeCommunities) => {
                    logger.info(`Community list fetched for company ${request.body.companyId}`)
                    logger.debug(JSON.stringify( { success: true, message: request.t('communityCreateSuccess'), communityList: newCommunityList, totalPageNum, noOfRecords, activeCommunities } ))
                    return response.status(201)
                    .send({ success: true, message: request.t('communityCreateSuccess'), communityList: newCommunityList, totalPageNum, noOfRecords, activeCommunities  });
                  })
                })
                .catch((err) => {
                  logger.warn(`Community created successfully, but failed to fetch the updated list`)
                  logger.error(err)
                  logger.debug(JSON.stringify( { success: false, message: request.t('communityCreateSuccessFetchFailed')  } ))
                  return response.status(201)
                      .send({ success: false, message: request.t('communityCreateSuccessFetchFailed')  });
                })
              })
          })
          .catch((err) => {
            logger.warn(`Failed to create a community for company ${request.body.companyId}`)
            logger.error(err)
            logger.debug(JSON.stringify( { success: false, message: request.t('communityCreateFailed') } ))
            return response.status(201)
                .send({ success: false, message: request.t('communityCreateFailed') });
          })
        } else {
          logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
          return response.status(400)
            .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static checkIfAliasAlreadyTaken(request, response) {
      const community = new Community(knex)

      if(request.body.alias) {
        logger.info(`Checking if community ID ${request.body.alias} already exists.`)
        community.isAliasAlreadyExistsUnderCompany(request.body.alias, request.body.companyId)
        .then((res) => {
          if(res == 0) {
            logger.info(`Community ID ${request.body.alias} does not exists`)
            logger.debug(JSON.stringify( { success: true, exist: false  } ))
            return response.status(201)
                  .send({ success: true, exist: false  });
          } else {
            logger.info(`Community ID ${request.body.alias} already exists`)
            logger.debug(JSON.stringify( { success: true, exist: true  } ))
            return response.status(201)
                  .send({ success: true, exist: true  });
          }
        })
        .catch((err) => {
          logger.warn(`Failed to check community status for ${request.body.alias}`)
          logger.error(err)
          logger.debug(JSON.stringify( { success: false } ))
          return response.status(201)
                  .send({ success: false });
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static checkIfAliasAlreadyTakenForUpdate(request, response) {
      const community = new Community(knex)

      //logger.debug(JSON.stringify( request ))
      logger.info(`Checking if community ID ${request.body.alias} already exists.`)
      community.isReservedAliasByCommunity(request.body.alias, request.body.communityId)
      .then((res) => {
        if(res == 1) {
          logger.info(`Community ID ${request.body.alias} does not exists`)
          logger.debug(JSON.stringify( { success: true, exist: false  } ))
          return response.status(201)
                    .send({ success: true, exist: false  });
        } else {
          community.isAliasAlreadyExists(request.body.alias)
          .then((res) => {
            if(res == 0) {
              logger.info(`Community ID ${request.body.alias} does not exists`)
              logger.debug(JSON.stringify( { success: true, exist: false  } ))
              return response.status(201)
                    .send({ success: true, exist: false  });
            } else {
              logger.info(`Community ID ${request.body.alias} already exists`)
              logger.debug(JSON.stringify( { success: true, exist: true  } ))
              return response.status(201)
                    .send({ success: true, exist: true  });
            }
          })
          .catch((err) => {
            logger.warn(`Failed to check community status for ${request.body.alias}`)
            logger.error(err)
            logger.debug(JSON.stringify( { success: false } ))
            return response.status(201)
                    .send({ success: false });
          })
        }
      })
    }

    static getCommunityList(request, response) {
        const community = new Community(knex)

        if(
          request.body.limit &&
          request.body.companyId
        ) {
          request.body.offset = request.body.offset ? request.body.offset : 0
          logger.info(`Fetching community list for company ${request.body.companyId}`)
          if(request.body.searchString && request.body.searchString != '') {
            community.searchCommunity(
              request.body.searchString, 
              request.body.offset,
              request.body.limit,
              request.body.companyId
            ).then((communityList) => {
              community.getTotalNumberOfPageForFilteredCommunityList(
                request.body.limit,
                request.body.companyId,
                request.body.searchString
              )
              .then((recordCounts) => {
                const {totalPageNum, noOfRecords} = recordCounts
                logger.info(`Community list fetched successfully for company ${request.body.companyId}`)
                logger.debug(JSON.stringify( { success: true, message: request.t('communityListFetchSuccess'), communityList, totalPageNum, noOfRecords  } ))
                return response.status(201)
                  .send({ success: true, message: request.t('communityListFetchSuccess'), communityList, totalPageNum, noOfRecords  });
              })
              .catch((err) => {
                logger.warn(`Failed to fetch the community list for company ${request.body.companyId}`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false, message: request.t('communityListFetchFailed')  } ))
                return response.status(201)
                  .send({ success: false, message: request.t('communityListFetchFailed')  });
              })
            })
            .catch((err) => {
              logger.warn(`Failed to fetch the community list for company ${request.body.companyId}`)
              logger.error(err)
              logger.debug(JSON.stringify( { success: false, message: request.t('communityListFetchFailed')  } ))
              return response.status(201)
                  .send({ success: false, message: request.t('communityListFetchFailed')  });
            })
          } else {
            community.getCommunityList(
              request.body.offset,
              request.body.limit,
              request.body.companyId
            )
            .then((communityList) => {
              community.getTotalNumberOfPageForCommunityList(request.body.limit, request.body.companyId)
              .then((recordCounts) => {
                const {totalPageNum, noOfRecords} = recordCounts
                logger.info(`Community list fetched successfully for company ${request.body.companyId}`)
                logger.debug(JSON.stringify( { success: true, message: request.t('communityListFetchSuccess'), communityList, totalPageNum, noOfRecords  } ))
                return response.status(201)
                  .send({ success: true, message: request.t('communityListFetchSuccess'), communityList, totalPageNum, noOfRecords  });
              })
              .catch((err) => {
                logger.warn(`Failed to fetch the community list for company ${request.body.companyId}`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false, message: request.t('communityListFetchFailed') } ))
                return response.status(201)
                    .send({ success: false, message: request.t('communityListFetchFailed') });
              })
            })
            .catch((err) => {
              logger.warn(`Failed to fetch the community list for company ${request.body.companyId}`)
              logger.error(err)
              logger.debug(JSON.stringify( { success: false, message: request.t('communityListFetchFailed') } ))
              return response.status(201)
                  .send({ success: false, message: request.t('communityListFetchFailed') });
            })
          }
        } else {
          logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
          return response.status(400)
            .send({success: false, message: "Missing parameters, fill all the required fields"});
        }
    }

    static deactivateCommunity(request, response) {
      const community = new Community(knex)

      if(
        request.body.limit &&
        request.body.companyId
      ) {
        request.body.offset = request.body.offset ? request.body.offset : 0
        logger.info(`Deactivating community ID ${request.body.communityId}`)
        community.deactivateCommunity(request.body.communityId)
        .then((res) => {
          if(res == 1) {
            logger.info(`Deactivated community ID ${request.body.communityId}`)
            logger.info(`Fetching updated community list for company ${request.body.companyId}`)
            if(request.body.searchString && request.body.searchString != '') {
              community.searchCommunity(
                request.body.searchString, 
                request.body.offset,
                request.body.limit,
                request.body.companyId
              ).then((communityList) => {
                community.getTotalNumberOfPageForFilteredCommunityList(
                  request.body.limit,
                  request.body.companyId,
                  request.body.searchString
                )
                .then((recordCounts) => {
                  const {totalPageNum, noOfRecords} = recordCounts
                  community.getActiveCommunityList(request.body.companyId)
                  .then((activeCommunities) => {
                    logger.info(`Updated community list fetched successfully for company ${request.body.companyId}`)
                    logger.debug(JSON.stringify( { success: true, message: request.t('communityDeactivateSuccess'), communityList, totalPageNum, noOfRecords, activeCommunities  } ))
                    return response.status(201)
                    .send({ success: true, message: request.t('communityDeactivateSuccess'), communityList, totalPageNum, noOfRecords, activeCommunities  });
                  })
                })
                .catch((err) => {
                  logger.warn(`Failed to fetch updated community list for community ${request.body.companyId}`)
                  logger.error(err)
                  logger.debug(JSON.stringify( { success: false, message: request.t('communityDeactivateSuccessFetchFailed')  } ))
                  return response.status(201)
                    .send({ success: false, message: request.t('communityDeactivateSuccessFetchFailed')  });
                })
              })
              .catch((err) => {
                logger.warn(`Failed to fetch updated community list for community ${request.body.companyId}`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false, message: request.t('communityDeactivateSuccessFetchFailed')  } ))
                return response.status(201)
                    .send({ success: false, message: request.t('communityDeactivateSuccessFetchFailed')  });
              })
            } else {
              community.getCommunityList(
                request.body.offset,
                request.body.limit,
                request.body.companyId
              )
              .then((communityList) => {
                community.getTotalNumberOfPageForCommunityList(request.body.limit, request.body.companyId)
                .then((recordCounts) => {
                  const {totalPageNum, noOfRecords} = recordCounts
                  community.getActiveCommunityList(request.body.companyId)
                  .then((activeCommunities) => {
                    logger.info(`Updated community list fetched successfully for company ${request.body.companyId}`)
                    logger.debug(JSON.stringify( { success: true, message: request.t('communityDeactivateSuccess'), communityList, totalPageNum, noOfRecords, activeCommunities  } ))
                    return response.status(201)
                    .send({ success: true, message: request.t('communityDeactivateSuccess'), communityList, totalPageNum, noOfRecords, activeCommunities  });
                  })
                })
                .catch((err) => {
                  logger.warn(`Failed to fetch updated community list for community ${request.body.companyId}`)
                  logger.error(err)
                  logger.debug(JSON.stringify( { success: false, message: request.t('communityDeactivateSuccessFetchFailed')  } ))
                  return response.status(201)
                      .send({ success: false, message: request.t('communityDeactivateSuccessFetchFailed')  });
                })
              })
              .catch((err) => {
                logger.warn(`Failed to fetch updated community list for community ${request.body.companyId}`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false, message: request.t('communityDeactivateSuccessFetchFailed')  } ))
                return response.status(201)
                    .send({ success: false, message: request.t('communityDeactivateSuccessFetchFailed')  });
              })
            }
          } else {
            logger.warn(`Failed to deactivate community ID ${request.body.communityId}`)
            logger.debug(JSON.stringify( { success: false, message: request.t('communityDeactivateFailed')  } ))
            return response.status(201)
                  .send({ success: false, message: request.t('communityDeactivateFailed')  });
          }
        })
        .catch((err) => {
          logger.warn(`Failed to deactivate community ID ${request.body.communityId}`)
          logger.error(err)
          logger.debug(JSON.stringify( { success: false, message: request.t('communityDeactivateFailed')  } ))
          return response.status(201)
                  .send({ success: false, message: request.t('communityDeactivateFailed')  });
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static activateCommunity(request, response) {
      const community = new Community(knex)

      if(
        request.body.limit &&
        request.body.companyId
      ) {
        request.body.offset = request.body.offset ? request.body.offset : 0
        logger.info(`Activating community ID ${request.body.communityId}`)
        community.activateCommunity(request.body.communityId)
        .then((res) => {
          if(res == 1) {
            logger.info(`Activated community ID ${request.body.communityId}`)
            logger.info(`Fetching updated community list for company ${request.body.companyId}`)
            if(request.body.searchString && request.body.searchString != '') {
              community.searchCommunity(
                request.body.searchString, 
                request.body.offset,
                request.body.limit,
                request.body.companyId
              ).then((communityList) => {
                community.getTotalNumberOfPageForFilteredCommunityList(
                  request.body.limit,
                  request.body.companyId,
                  request.body.searchString
                )
                .then((recordCounts) => {
                  const {totalPageNum, noOfRecords} = recordCounts
                  community.getActiveCommunityList(request.body.companyId)
                  .then((activeCommunities) => {
                    logger.info(`Updated community list fetched successfully for company ${request.body.companyId}`)
                    logger.debug(JSON.stringify( { success: true, message: request.t('communityActivateSuccess'), communityList, totalPageNum, noOfRecords, activeCommunities  } ))
                    return response.status(201)
                    .send({ success: true, message: request.t('communityActivateSuccess'), communityList, totalPageNum, noOfRecords, activeCommunities  });
                  })
                })
                .catch((err) => {
                  logger.warn(`Failed to fetch updated community list for community ${request.body.companyId}`)
                  logger.error(err)
                  logger.debug(JSON.stringify( { success: false, message: request.t('communityActivateSuccessFetchFailed')  } ))
                  return response.status(201)
                    .send({ success: false, message: request.t('communityActivateSuccessFetchFailed')  });
                })
              })
              .catch((err) => {
                logger.warn(`Failed to fetch updated community list for community ${request.body.companyId}`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false, message: request.t('communityActivateSuccessFetchFailed')  } ))
                return response.status(201)
                    .send({ success: false, message: request.t('communityActivateSuccessFetchFailed')  });
              })
            } else {
              community.getCommunityList(
                request.body.offset,
                request.body.limit,
                request.body.companyId
              )
              .then((communityList) => {
                community.getTotalNumberOfPageForCommunityList(request.body.limit, request.body.companyId)
                .then((recordCounts) => {
                  const {totalPageNum, noOfRecords} = recordCounts
                  community.getActiveCommunityList(request.body.companyId)
                  .then((activeCommunities) => {
                    logger.info(`Updated community list fetched successfully for company ${request.body.companyId}`)
                    logger.debug(JSON.stringify( { success: true, message: request.t('communityActivateSuccess'), communityList, totalPageNum, noOfRecords, activeCommunities  } ))
                    return response.status(201)
                    .send({ success: true, message: request.t('communityActivateSuccess'), communityList, totalPageNum, noOfRecords, activeCommunities  });
                  })
                })
                .catch((err) => {
                  logger.warn(`Failed to fetch updated community list for community ${request.body.companyId}`)
                  logger.error(err)
                  logger.debug(JSON.stringify( { success: false, message: request.t('communityActivateSuccessFetchFailed')  } ))
                  return response.status(201)
                      .send({ success: false, message: request.t('communityActivateSuccessFetchFailed')  });
                })
              })
              .catch((err) => {
                logger.warn(`Failed to fetch updated community list for community ${request.body.companyId}`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false, message: request.t('communityActivateSuccessFetchFailed')  } ))
                return response.status(201)
                    .send({ success: false, message: request.t('communityActivateSuccessFetchFailed')  });
              })
            }
          } else {
            logger.warn(`Failed to activate community ID ${request.body.communityId}`)
            logger.debug(JSON.stringify( { success: false, message: request.t('communityActivateFailed')  } ))
            return response.status(201)
                  .send({ success: false, message: request.t('communityActivateFailed')  });
          }
        })
        .catch((err) => {
          logger.warn(`Failed to activate community ID ${request.body.communityId}`)
          logger.error(err)
          logger.debug(JSON.stringify( { success: false, message: request.t('communityActivateFailed')  } ))
          return response.status(201)
                  .send({ success: false, message: request.t('communityActivateFailed')  });
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static deleteCommunities(request, response) {
      const community = new Community(knex)

      if(
        request.body.limit &&
        request.body.companyId
      ) {
        request.body.offset = request.body.offset ? request.body.offset : 0
        logger.info(`Deleting communities for company ${request.body.companyId}`)
        community.deleteCommunities(request.body.communityIds)
        .then((res) => {
          if(res == 1) {
            logger.info(`Communities deleted for company ${request.body.companyId}`)
            logger.info(`Fetching updated communities for company ${request.body.companyId}`)
            community.getCommunityList(
              request.body.offset,
              request.body.limit,
              request.body.companyId
            )
            .then((communityList) => {
              community.getTotalNumberOfPageForCommunityList(request.body.limit, request.body.companyId)
              .then((recordCounts) => {
                const {totalPageNum, noOfRecords} = recordCounts
                logger.info(`Updated communities fetched successfully for company ${request.body.companyId}`)
                logger.debug(JSON.stringify( { success: true, message: request.t('communitiesDeleteSuccess'), communityList, totalPageNum, noOfRecords  } ))
                return response.status(201)
                  .send({ success: true, message: request.t('communitiesDeleteSuccess'), communityList, totalPageNum, noOfRecords  });
              })
              .catch((err) => {
                logger.warn(`Failed to fetch the updated communities for company ${request.body.companyId}`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false, message: request.t('communitiesDeleteFailed')  } ))
                return response.status(201)
                    .send({ success: false, message: request.t('communitiesDeleteFailed')  });
              })
            })
            .catch((err) => {
              logger.warn(`Failed to fetch the updated communities for company ${request.body.companyId}`)
              logger.error(err)
              logger.debug(JSON.stringify( { success: false, message: request.t('communitiesDeleteFailed')  } ))
              return response.status(201)
                  .send({ success: false, message: request.t('communitiesDeleteFailed')  });
            })
          } else {
            logger.warn(`Failed to delete communities for company ${request.body.companyId}`)
            logger.debug(JSON.stringify( { success: false, message: request.t('communitiesDeleteFailed')  } ))
            return response.status(201)
                  .send({ success: false, message: request.t('communitiesDeleteFailed')  });
          }
        })
        .catch((err) => {
          logger.warn(`Failed to delete communities for company ${request.body.companyId}`)
          logger.error(err)
          logger.debug(JSON.stringify( { success: false, message: request.t('communitiesDeleteFailed')  } ))
          return response.status(201)
                  .send({ success: false, message: request.t('communitiesDeleteFailed')  });
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static getActiveCommunityList(request, response) {
      const community = new Community(knex)

      if(request.body.companyId) {
        logger.info(`Fetching active communities list for company ${request.body.companyId}`)
        community.getActiveCommunityList(request.body.companyId)
        .then((_list) => {
          logger.info(`Active communities fetched successfully for ${request.body.companyId}`)
          logger.debug(JSON.stringify( { success: true, communityList: _list } ))
          return response.status(201)
            .send({ success: true, communityList: _list });
        })
        .catch((err) => {
          logger.warn(`Failed to fetch active communities for ${request.body.companyId}`)
          logger.debug(JSON.stringify( { success: false, message: request.t('activeCommunitiesFetchFailed')  } ))
          return response.status(201)
                  .send({ success: false, message: request.t('activeCommunitiesFetchFailed')  });
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }

    static updateCommunity(request, response) {
      const community = new Community(knex)
      const documents = new Documents(knex)

      if(
        request.body.communityName &&
        request.body.communityAlias &&
        request.body.streetName &&
        request.body.city &&
        request.body.state &&
        request.body.zipcode &&
        request.body.communityId &&
        request.body.limit
      ) {
        request.body.offset = request.body.offset ? request.body.offset : 0
        logger.info(`Updating community ID ${request.body.communityId}`)
        community.updateCommunity(
          request.body.communityName,
          request.body.communityAlias,
          request.body.streetName,
          request.body.city,
          request.body.state,
          request.body.zipcode,
          request.body.communityId
        )
        .then((res) => {
          if(res == 1) {
            logger.info(`Data updated successfully for community ${request.body.communityId}`)
            logger.info(`Fetching updated communities`)
            if(request.body.searchString && request.body.searchString != '') {
              community.searchCommunity(
                request.body.searchString, 
                request.body.offset,
                request.body.limit,
                request.body.companyId
              ).then((communityList) => {
                community.getTotalNumberOfPageForFilteredCommunityList(
                  request.body.limit,
                  request.body.companyId,
                  request.body.searchString
                )
                .then((recordCounts) => {
                  const {totalPageNum, noOfRecords} = recordCounts
                  community.getActiveCommunityList(request.body.companyId)
                  .then((activeCommunities) => {
                    logger.info(`Updated communities fetched for company ${request.body.companyId}`)
                    logger.debug(JSON.stringify( { success: true, message: request.t('communityUpdateSuccess'), communityList, totalPageNum, noOfRecords, activeCommunities  } ))
                    return response.status(201)
                    .send({ success: true, message: request.t('communityUpdateSuccess'), communityList, totalPageNum, noOfRecords, activeCommunities  });
                  })
                })
                .catch((err) => {
                  logger.warn(`Failed to fetch updated communities for company ${request.body.companyId}`)
                  logger.error(err)
                  logger.debug(JSON.stringify( { success: false, message: request.t('communityUpdateSuccessFetchFailed')  } ))
                  return response.status(201)
                    .send({ success: false, message: request.t('communityUpdateSuccessFetchFailed')  });
                })
              })
              .catch((err) => {
                logger.warn(`Failed to fetch updated communities for company ${request.body.companyId}`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false, message: request.t('communityUpdateSuccessFetchFailed')  } ))
                return response.status(201)
                    .send({ success: false, message: request.t('communityUpdateSuccessFetchFailed')  });
              })
            } else {
              community.getCommunityList(
                request.body.offset,
                request.body.limit,
                request.body.companyId
              )
              .then((communityList) => {
                community.getTotalNumberOfPageForCommunityList(request.body.limit, request.body.companyId)
                .then((recordCounts) => {
                  const {totalPageNum, noOfRecords} = recordCounts
                  community.getActiveCommunityList(request.body.companyId)
                  .then((activeCommunities) => {
                    logger.info(`Updated communities fetched for company ${request.body.companyId}`)
                    logger.debug(JSON.stringify( { success: true, message: request.t('communityUpdateSuccess'), communityList, totalPageNum, noOfRecords, activeCommunities  } ))
                    return response.status(201)
                    .send({ success: true, message: request.t('communityUpdateSuccess'), communityList, totalPageNum, noOfRecords, activeCommunities  });
                  })
                })
                .catch((err) => {
                  logger.warn(`Failed to fetch updated communities for company ${request.body.companyId}`)
                  logger.error(err)
                  logger.debug(JSON.stringify( { success: false, message: request.t('communityUpdateSuccessFetchFailed')  } ))
                  return response.status(201)
                      .send({ success: false, message: request.t('communityUpdateSuccessFetchFailed')  });
                })
              })
              .catch((err) => {
                logger.warn(`Failed to fetch updated communities for company ${request.body.companyId}`)
                logger.error(err)
                logger.debug(JSON.stringify( { success: false, message: request.t('communityUpdateSuccessFetchFailed')  } ))
                return response.status(201)
                    .send({ success: false, message: request.t('communityUpdateSuccessFetchFailed')  });
              })
            }
          } else {
            logger.warn(`Community update failed for Id ${request.body.communityId}`)
            logger.debug(JSON.stringify( { success: false, message: request.t('communityUpdateFailed1')  } ))
            return response.status(201)
                .send({ success: false, message: request.t('communityUpdateFailed1')  });
          }
        })
        .catch((err) => {
          logger.warn(`Community update failed for Id ${request.body.communityId}`)
          logger.error(err)
          logger.debug(JSON.stringify( { success: false, message: request.t('communityUpdateFailed1')  } ))
          return response.status(201)
              .send({ success: false, message: request.t('communityUpdateFailed1')  });
        })
      } else {
        logger.debug(JSON.stringify( {success: false, message: "Missing parameters, fill all the required fields"} ))
        return response.status(400)
          .send({success: false, message: "Missing parameters, fill all the required fields"});
      }
    }
}

module.exports = CommunityController