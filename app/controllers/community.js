var jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Community = require('../services/Community')
const Documents = require('../services/Documents')
const winston = require('winston');
const { combine, timestamp, json } = winston.format;
const i18n =  require('../i18n.config');

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

class CommunityController {
    static createNewCommunity(request, response) {
        const community = new Community(knex)
        const documents = new Documents(knex)

        community.createCommunity(
            request.body.communityName,
            request.body.communityAlias,
            request.body.streetName,
            request.body.city,
            request.body.state,
            request.body.zipcode,
            request.body.creator,
            request.body.companyId
        )
        .then((communityId) => {
            documents.createCommunityFolder(request.body.communityAlias)
            documents.createFolder("Financial", 'tooltip', true, 4, communityId,)
            documents.createFolder("Meetings", 'tooltip', true, 4, communityId)
            documents.createFolder("Governing & Legal", 'tooltip', true, 4, communityId)
            documents.createFolder("Community", 'tooltip', true, 4, communityId)

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
                  return response.status(201)
                  .send({ success: true, message: 'Community created successfully', communityList: newCommunityList, totalPageNum, noOfRecords, activeCommunities  });
                })
              })
              .catch((err) => {
                console.log(err)
                return response.status(201)
                    .send({ success: false, message: 'Community created successfully, but failed to fetch the updated list, please reload the page'  });
              })
            })
        })
        .catch((err) => {
          console.log(err)
            return response.status(201)
                .send({ success: false, message: 'Failed to create community'  });
        })
    }

    static checkIfAliasAlreadyTaken(request, response) {
      const community = new Community(knex)

      community.isAliasAlreadyExists(request.body.alias)
      .then((res) => {
        if(res == 0) {
          return response.status(201)
                .send({ success: true, exist: false  });
        } else {
          return response.status(201)
                .send({ success: true, exist: true  });
        }
      })
      .catch((err) => {
        return response.status(201)
                .send({ success: false });
      })
    }

    static checkIfAliasAlreadyTakenForUpdate(request, response) {
      const community = new Community(knex)

      community.isReservedAliasByCommunity(request.body.alias, request.body.communityId)
      .then((res) => {
        if(res == 1) {
          return response.status(201)
                    .send({ success: true, exist: false  });
        } else {
          community.isAliasAlreadyExists(request.body.alias)
          .then((res) => {
            if(res == 0) {
              return response.status(201)
                    .send({ success: true, exist: false  });
            } else {
              return response.status(201)
                    .send({ success: true, exist: true  });
            }
          })
          .catch((err) => {
            return response.status(201)
                    .send({ success: false });
          })
        }
      })
    }

    static getCommunityList(request, response) {
        const community = new Community(knex)

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
              return response.status(201)
                .send({ success: true, message: 'Community list fetched successfully', communityList, totalPageNum, noOfRecords  });
            })
            .catch((err) => {
              console.log(err)
              return response.status(201)
                .send({ success: false, message: 'Failed to fetch community list'  });
            })
          })
          .catch((err) => {
            console.log(err)
            return response.status(201)
                .send({ success: false, message: 'Failed to fetch community list'  });
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
              return response.status(201)
                .send({ success: true, message: 'Community list fetched successfully', communityList, totalPageNum, noOfRecords  });
            })
            .catch((err) => {
              console.log(err)
              return response.status(201)
                  .send({ success: false, message: 'Failed to fetch community list'  });
            })
          })
          .catch((err) => {
            console.log(err)
            return response.status(201)
                .send({ success: false, message: 'Failed to fetch community list'  });
          })
        }
    }

    static deactivateCommunity(request, response) {
      const community = new Community(knex)

      community.deactivateCommunity(request.body.communityId)
      .then((res) => {
        if(res == 1) {
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
                  return response.status(201)
                  .send({ success: true, message: 'Community delactivated successfully', communityList, totalPageNum, noOfRecords, activeCommunities  });
                })
              })
              .catch((err) => {
                console.log(err)
                return response.status(201)
                  .send({ success: false, message: 'Community delactivated successfully, but failed the fetch the updated list'  });
              })
            })
            .catch((err) => {
              console.log(err)
              return response.status(201)
                  .send({ success: false, message: 'Community delactivated successfully, but failed the fetch the updated list'  });
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
                  return response.status(201)
                  .send({ success: true, message: 'Community delactivated successfully', communityList, totalPageNum, noOfRecords, activeCommunities  });
                })
              })
              .catch((err) => {
                console.log(err)
                return response.status(201)
                    .send({ success: false, message: 'Community delactivated successfully, but failed the fetch the updated list'  });
              })
            })
            .catch((err) => {
              console.log(err)
              return response.status(201)
                  .send({ success: false, message: 'Community deactivated successfully, but failed the fetch the updated list'  });
            })
          }
        } else {
          return response.status(201)
                .send({ success: false, message: 'Failed to deactivate community'  });
        }
      })
      .catch((err) => {
        console.log(err)
        return response.status(201)
                .send({ success: false, message: 'Failed to deactivate community'  });
      })
    }

    static activateCommunity(request, response) {
      const community = new Community(knex)

      community.activateCommunity(request.body.communityId)
      .then((res) => {
        if(res == 1) {
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
                  return response.status(201)
                  .send({ success: true, message: 'Community activated successfully', communityList, totalPageNum, noOfRecords, activeCommunities  });
                })
              })
              .catch((err) => {
                console.log(err)
                return response.status(201)
                  .send({ success: false, message: 'Community activated successfully, but failed the fetch the updated list'  });
              })
            })
            .catch((err) => {
              console.log(err)
              return response.status(201)
                  .send({ success: false, message: 'Community activated successfully, but failed the fetch the updated list'  });
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
                  return response.status(201)
                  .send({ success: true, message: 'Community activated successfully', communityList, totalPageNum, noOfRecords, activeCommunities  });
                })
              })
              .catch((err) => {
                console.log(err)
                return response.status(201)
                    .send({ success: false, message: 'Community activated successfully, but failed the fetch the updated list'  });
              })
            })
            .catch((err) => {
              console.log(err)
              return response.status(201)
                  .send({ success: false, message: 'Community activated successfully, but failed the fetch the updated list'  });
            })
          }
        } else {
          return response.status(201)
                .send({ success: false, message: 'Failed to activate community'  });
        }
      })
      .catch((err) => {
        console.log(err)
        return response.status(201)
                .send({ success: false, message: 'Failed to activate community'  });
      })
    }

    static deleteCommunities(request, response) {
      const community = new Community(knex)

      community.deleteCommunities(request.body.communityIds)
      .then((res) => {
        if(res == 1) {
          community.getCommunityList(
            request.body.offset,
            request.body.limit,
            request.body.companyId
          )
          .then((communityList) => {
            community.getTotalNumberOfPageForCommunityList(request.body.limit, request.body.companyId)
            .then((recordCounts) => {
              const {totalPageNum, noOfRecords} = recordCounts
              return response.status(201)
                .send({ success: true, message: 'Communities deleted successfully', communityList, totalPageNum, noOfRecords  });
            })
            .catch((err) => {
              console.log(err)
              return response.status(201)
                  .send({ success: false, message: 'Failed to delete communities'  });
            })
          })
          .catch((err) => {
            console.log(err)
            return response.status(201)
                .send({ success: false, message: 'Failed to delete communities'  });
          })
        } else {
          return response.status(201)
                .send({ success: false, message: 'Failed to delete communities'  });
        }
      })
      .catch((err) => {
        console.log(err)
        return response.status(201)
                .send({ success: false, message: 'Failed to delete communities'  });
      })
    }

    static getActiveCommunityList(request, response) {
      const community = new Community(knex)

      community.getActiveCommunityList(request.body.companyId)
      .then((_list) => {
        return response.status(201)
          .send({ success: true, communityList: _list });
      })
      .catch((err) => {
        return response.status(201)
                .send({ success: false, message: 'Failed to fetch communities'  });
      })
    }

    static updateCommunity(request, response) {
      const community = new Community(knex)
      const documents = new Documents(knex)

      documents.renameCommunityDirectory(request.body.communityId, request.body.communityAlias)
      .then((res) => {
        if(res == 1) {
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
                      return response.status(201)
                      .send({ success: true, message: 'Community updated successfully', communityList, totalPageNum, noOfRecords, activeCommunities  });
                    })
                  })
                  .catch((err) => {
                    console.log(err)
                    return response.status(201)
                      .send({ success: false, message: 'Community updated successfully, but failed the fetch the updated list'  });
                  })
                })
                .catch((err) => {
                  console.log(err)
                  return response.status(201)
                      .send({ success: false, message: 'Community updated successfully, but failed the fetch the updated list'  });
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
                      return response.status(201)
                      .send({ success: true, message: 'Community updated successfully', communityList, totalPageNum, noOfRecords, activeCommunities  });
                    })
                  })
                  .catch((err) => {
                    console.log(err)
                    return response.status(201)
                        .send({ success: false, message: 'Community updated successfully, but failed the fetch the updated list'  });
                  })
                })
                .catch((err) => {
                  console.log(err)
                  return response.status(201)
                      .send({ success: false, message: 'Community updated successfully, but failed the fetch the updated list'  });
                })
              }
            } else {
              return response.status(201)
                  .send({ success: false, message: 'Failed to update community'  });
            }
          })
          .catch((err) => {
            console.log(err)
            return response.status(201)
                .send({ success: false, message: 'Failed to update community'  });
          })
        } else {
          return response.status(201)
                  .send({ success: false, message: 'Failed to update community'  });
        }
      })
      .catch((err) => {
        return response.status(201)
                  .send({ success: false, message: 'Failed to update community, cannot rename old directory'  });
      })
    }
}

module.exports = CommunityController