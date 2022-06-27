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
        Expires: 45,
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

exports.generatePrivateContentTwinUploadUrl = (
  extension,
  type,
  albumId,
  albumType
) => {
  let uniqueImageName
  return nanoid(24)
    .then((id) => {
      uniqueImageName = id
      const origParams = {
        Bucket: `${bucketName}/${
          albumType === "imageAlbum" ? "image-album" : "video-album"
        }/${albumId}`,
        Key: `${uniqueImageName}**__original${extension}`,
        Expires: 60,
        ContentType: type,
      }
      const thumbParams = {
        Bucket: `${bucketName}/${
          albumType === "imageAlbum" ? "image-album" : "video-album"
        }/${albumId}`,
        Key: `${uniqueImageName}**__thumbnail${extension}`,
        Expires: 60,
        ContentType: type,
      }
      return Promise.all([
        s3.getSignedUrlPromise("putObject", origParams),
        s3.getSignedUrlPromise("putObject", thumbParams),
      ])
    })
    .then((values) => {
      return {
        uploadUrls: values,
        key: uniqueImageName,
      }
    })
}

exports.deleteImage = (url) => {
  return s3
    .deleteObject({
      Bucket: bucketName,
      key: url.substr(60),
    })
    .promise()
    .then((result) => {
      console.info("Delete object: ", url.substr(97))
      return result
    })
    .catch((e) => console.log(e))
}

exports.deleteImages = (urls = []) => {
  /**
   * provide the complete url without deleting the initial part
   */
  return s3
    .deleteObjects({
      Bucket: bucketName,
      Delete: {
        Objects: urls
          .filter((key) => {
            if (!key) {
              // remove null entries
              return false
            }
            return true
          })
          .map((key) => ({ Key: decodeURI(key.substr(60)) })),
        Quiet: false,
      },
    })
    .promise()
}
