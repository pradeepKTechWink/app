const { create } = require("express-handlebars");
const user = require("../routes/user")
const winston = require('winston');
const { combine, timestamp, json } = winston.format;
const { v5: uuidv5   } = require('uuid');
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


class Community {
    constructor(dbConnection) {
        this.dbConnection = dbConnection
    }

    createCommunity(
        communityName,
        communityAlias,
        creator,
        companyId
    ) {
        return new Promise((resolve, reject) => {

            const dateTime = new Date()
            const uuid = this.generateUUID(communityAlias, companyId)
            this.dbConnection('communities')
            .insert({
                companyId : companyId,
                creator : creator,
                community_name : communityName,
                community_alias : communityAlias,
                active: 1,
                uuid,
                created : dateTime,
                updated : dateTime
            })
            .then((communityId) => {
                resolve({
                    communityId,
                    uuid
                })
            })
            .catch((err) => {
                reject(err)
            })
        })
    }

    generateUUID(alias, companyId) {
        const uniqueId = uuidv5(`${alias}-${companyId}-${new Date()}`, process.env.UUID_NAMESPACE)
        return uniqueId
    }

    updateCommunity(
        communityName,
        communityAlias,
        streetName,
        city,
        state,
        zipcode,
        communityId
    ) {
        return new Promise((resolve, reject) => {
            const dateTime = new Date()

            this.dbConnection('communities')
            .where({ id: communityId })
            .update(
                {
                    community_name : communityName,
                    community_alias: communityAlias,
                    street : streetName,
                    city : city,
                    state : state,
                    zipcode : zipcode,
                    updated : dateTime
                }
            ).then((res) => {
                if(res == 1) {
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

    getTotalNumberOfPageForCommunityList(limit, companyId) {
        return new Promise((resolve, reject) => {
            this.dbConnection
            .select('*')
            .from('communities')
            .where({ companyId: companyId })
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

    getTotalNumberOfPageForFilteredCommunityList(limit, companyId, searchString) {
        return new Promise((resolve, reject) => {
            this.dbConnection
            .select('*')
            .from('communities')
            .where({ companyId: companyId })
            .whereLike('community_name', `%${searchString}%`)
            .orWhereLike('community_alias', `%${searchString}%`)
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

    getCommunityList(
        offset,
        limit,
        companyId
    ) {
        return new Promise((resolve, reject) => {
            this.dbConnection
            .select('*')
            .from('communities')
            .where({ companyId: companyId})
            .limit(limit)
            .offset(offset)
            .orderBy('created', 'desc')
            .then(async (communityList) => {
                // await communityList.map(async (community) => {
                //     const noOfFiles = await this.getNoOfFilesInCommunity(community.id)
                //     community.selected = false
                //     community.noOfFiles = noOfFiles
                // })
                for (const community of communityList) {
                    const noOfFiles = await this.getNoOfFilesInCommunity(community.id)
                    community.selected = false
                    community.noOfFiles = noOfFiles
                }
                resolve(communityList)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    getNoOfFilesInCommunity(communityId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
            .select("*")
            .where({ communityId })
            .andWhere({ isFile: 1 })
            .then((res) => {
                resolve(res.length)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    getAllCommunityList(
        companyId
    ) {
        return new Promise((resolve, reject) => {
            this.dbConnection
            .select('*')
            .from('communities')
            .where({ companyId: companyId})
            .then(async (communityList) => {
                resolve(communityList)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    getActiveCommunityList(
        companyId
    ) {
        return new Promise((resolve, reject) => {
            this.dbConnection
            .select('*')
            .from('communities')
            .where({ companyId: companyId})
            .andWhere({ active: 1 })
            .then(async (communityList) => {
                await communityList.map((community) => {
                    community.selected = false
                })
                resolve(communityList)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    searchCommunity(
        searchString, 
        offset, 
        limit, 
        companyId
    ) {
        return new Promise((resolve, reject) => {
            this.dbConnection('communities')
            .whereLike('community_name', `%${searchString}%`)
            .orWhereLike('community_alias', `%${searchString}%`)
            .where({ companyId: companyId})
            .limit(limit)
            .offset(offset)
            .orderBy('created', 'desc')
            .then(async (communityList) => {
                await communityList.map((community) => {
                    community.selected = false
                })
                resolve(communityList)
            })
            .catch((err) => {
                logger.error(err)
                reject(err)
            })
        })
    }

    deleteCommunity(communityId) {
        return new Promise((resolve, reject) => {
            try {
                this.dbConnection.raw(
                    'Delete from communities where id = ?',
                    [communityId]
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

    deactivateCommunity(communityId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("communities")
            .where({ id: communityId })
            .update({
                active: 0
            })
            .then((res) => {
                if(res == 1) {
                    resolve(res)
                } else {
                    resolve(0)
                }
            })
            .catch((err) => {
                console.log(err)
            })
        })
    }

    activateCommunity(communityId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("communities")
            .where({ id: communityId })
            .update({
                active: 1
            })
            .then((res) => {
                if(res == 1) {
                    resolve(res)
                } else {
                    resolve(0)
                }
            })
            .catch((err) => {
                console.log(err)
            })
        })
    }

    deleteCommunities(communityIds) {
        return new Promise(async (resolve, reject) => {
            try {
                await communityIds.map(async (comId) => {
                    await this.dbConnection.raw(
                        'Delete from communities where id = ?',
                        [comId]
                    )
                })
                resolve(1)
            } catch (error) {
                logger.error(error)
                reject(error)
            }
        })
    }

    isAliasAlreadyExists(alias) {
        return new Promise((resolve, reject) => {
            this.dbConnection('communities')
            .select('*')
            .where({ community_alias: alias })
            .then((res) => {
                if(res.length > 0) {
                    resolve(1)
                } else {
                    resolve(0)
                }
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    isAliasAlreadyExistsUnderCompany(alias, companyId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('communities')
            .select('*')
            .where({ community_alias: alias })
            .andWhere({ companyId })
            .then((res) => {
                if(res.length > 0) {
                    resolve(1)
                } else {
                    resolve(0)
                }
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    isReservedAliasByCommunity(alias, communityId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('communities')
            .select('community_alias')
            .where({ id: communityId })
            .then((res) => {
                if(res[0].community_alias == alias) {
                    resolve(1)
                } else {
                    resolve(0)
                }
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    getCommunityAlias(communityId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('communities')
            .select('community_alias')
            .where({ id: communityId })
            .then((res) => {
                resolve(res[0]["community_alias"])
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    getCommunityUUID(communityId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('communities')
            .select('uuid')
            .where({ id: communityId })
            .then((res) => {
                resolve(res[0]["uuid"])
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    getCommunity(communityId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('communities')
            .select('*')
            .where({ id: communityId })
            .then((res) => {
                resolve(res)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    getCompanyIdForCommunity(communityId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('communities')
            .select('companyId')
            .where({ id: communityId })
            .then((res) => {
                resolve(res[0]["companyId"])
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }
}

module.exports = Community