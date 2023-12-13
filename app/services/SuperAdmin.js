class SuperAdmin {
    constructor(dbConnection) {
        this.dbConnection = dbConnection
    }

    getSettings(metaKey) {
        return new Promise((resolve, reject) => {
            this.dbConnection("super-admin-settings")
            .select('*')
            .where({ meta_key: metaKey })
            .then((res) => {
                resolve(res)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }
}

module.exports = SuperAdmin