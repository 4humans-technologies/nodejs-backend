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
  signatureVersion: "v4",
})

exports.generatePublicUploadUrl = (extension, type) => {
  let uniqueImageName
  return nanoid(24)
    .then((id) => {
      uniqueImageName = id
      const params = {
        Bucket: bucketName,
        Key: `${uniqueImageName}${extension}`,
        Expires: 60,
        ContentType: type,
      }
      return s3.getSignedUrlPromise("putObject", params)
    })
    .then((url) => {
      return {
        uploadUrl: url,
        key: uniqueImageName,
      }
    })
}

exports.deleteObjectFromS3 = (attachmentId) => {
  s3.deleteObject(
    {
      Bucket: bucketName,
      Key: attachmentId,
    },
    function (err, data) {
      if (err) {
      } else {
      }
    }
  )
}
