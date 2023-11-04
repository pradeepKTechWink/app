const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const pdfToPng = require('pdf-to-png-converter').pdfToPng;
const dotenv = require('dotenv');
dotenv.config();

class PDFExtractor {

    generateNumbersList(num) {
        let pageList = []
        for (let index = 1; index <= num; index++) {
            pageList.push(index)
        }
        return pageList
    }

    getPageList(pdfPath) {
        return new Promise((resolve, reject) => {
            try {
                const dataBuffer = fs.readFileSync(pdfPath)
                pdf(dataBuffer)
                .then((data) => {
                    const pageList = this.generateNumbersList(data.numpages)
                    resolve(pageList)
                })
                .catch((err) => {
                    reject(err)
                })
            } catch (error) {
                reject(error)
            }
        })
    }

    async getConverterConfig(buffer, pageList) {
        const pngPage = await pdfToPng(buffer, {
            disableFontFace: false,
            useSystemFonts: false,
            pagesToProcess: pageList,
            viewportScale: 2.0
        });
        return pngPage;
    }

    async checkIfImageDirectoryExist(directoryName) {
        const folderPath = `${process.env.TMP_IMAGE_PATH}/` + directoryName
        if(!fs.existsSync(path.resolve(folderPath))){
            await fsp.mkdir(folderPath)
        }
        return
    }

    async checkIfTextDirectoryExist(directoryName) {
        const folderPath = `${process.env.TMP_TXT_PATH}/` + directoryName
        if(!fs.existsSync(path.resolve(folderPath))){
            // fs.mkdirSync(folderPath);
            await fsp.mkdir(folderPath)
        }
        return
    }

    convertPDFtoPNG(pdfPath, userId) {
        return new Promise(async (resolve, reject) => {
            const buffer = fs.readFileSync(pdfPath)
            const pageList = await this.getPageList(pdfPath)
            const imgFileNameList = []

            this.getConverterConfig(buffer, pageList)
            .then(async (res) => {
                let index = 1;
                for (const imgData of res) {
                    await this.checkIfImageDirectoryExist(userId)
                    await fsp.writeFile(`${process.env.TMP_IMAGE_PATH}/${userId}/tmp${index}.png`, imgData.content)
                    imgFileNameList.push(`tmp${index}.png`)
                    index++
                }
                resolve(imgFileNameList)
            })
            .catch((err) => {
                console.log(err)
                reject(err)
            })
        })
    }

    async extractTextFromPDF(pdfPath, userId) {
        let extractedText = []
        const imagePath = `${process.env.TMP_IMAGE_PATH}/${userId}`
        const imageList = await this.convertPDFtoPNG(pdfPath, userId)
        const worker = await createWorker('eng');
        
        for (const imageName of imageList) {
            const response = await worker.recognize(path.resolve(`${imagePath}/${imageName}`));
            extractedText.push(response.data.text)
        }
        await worker.terminate();
        return extractedText
    }

    async removeLineBreak(text) {
        return text.replace(/\n/g, '')
    }

    async convertPDFToText(pdfPath, userId, fileName) {
        try {
            const extractedTexts = await this.extractTextFromPDF(pdfPath, userId)
            for (const text of extractedTexts) {
                await this.checkIfTextDirectoryExist(userId)
                const cleanedData = await this.removeLineBreak(text)
                console.log(cleanedData)
                await fsp.appendFile(`${process.env.TMP_TXT_PATH}/${userId}/${fileName}.txt`, cleanedData)
            }
            return path.resolve(`${process.env.TMP_TXT_PATH}/${userId}/${fileName}.txt`)
        } catch (error) {
            console.log(error)
        }
    }

    clearTempFiles(directoryName) {
        return new Promise((resolve, reject) => {
            const imgFolderPath = `${process.env.TMP_IMAGE_PATH}/${directoryName}`
            const textFolderPath = `${process.env.TMP_TXT_PATH}/${directoryName}`
            fs.readdir(imgFolderPath, async (err, files) => {
                if (err) reject(err);
                for (const file of files) {
                    await fsp.unlink(path.join(imgFolderPath, file))
                }
            })
            // fs.readdir(textFolderPath, async (err, files) => {
            //     if (err) reject(err);
            //     for (const file of files) {
            //         await fsp.unlink(path.join(textFolderPath, file))
            //     }
            // })
        })
    }
}

module.exports = PDFExtractor