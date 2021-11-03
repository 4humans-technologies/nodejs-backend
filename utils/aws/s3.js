const aws = require("aws-sdk")
const { nanoid } = require("nanoid/async")

const region = "ap-south-1"
const bucketName = "dreamgirl-public-bucket"
const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID
const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY

const s3 = new aws.S3({
    region: region,
    accessKeyId,
    secretAccessKey,
    signatureVersion: "v4"
})

exports.generatePublicUploadUrl = () => {
    return nanoid(20)
        .then(uniqueImageName => {
            const params = ({
                Bucket: bucketName,
                Key: uniqueImageName,
                Expires: 60
            })
            return s3.getSignedUrlPromise('putObject', params)
        })
}

exports.deleteObjectFromS3 = (attachmentId) => {
    s3.deleteObject({
        Bucket: bucketName,
        Key: attachmentId
    }, function (err, data) {
        if (err) {

        } else {

        }
    })
}