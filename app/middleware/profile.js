const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const multer = require('multer');

dotenv.config();


const Profile = {

    uploadProfilePics(req, res, next) {

        let imageName;

        try {
            let uploadStorage = multer.diskStorage({
                destination: function (req, file, cb) {
                    console.log(req.body)
                    cb(null, '../uploads');
                },
                filename: function (req, file, cb) {
                    imageName = file.originalname;
                    //imageName += "_randomstring"
                    cb(null, imageName);
                }
            });
    
            let uploader = multer({storage: uploadStorage});
    
            let uploadFile = uploader.single('image');
    
            uploadFile(req, res, function (err) {
    
                if(err) {
                    console.log(err)
                }
                console.log(req.body)
                req.imageName = imageName;
                req.uploadError = err;
                next();
            })    
        } catch(err) {
            console.log(err)
        }
    }
};

module.exports = Profile;