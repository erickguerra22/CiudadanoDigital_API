import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import config from 'config'

const awsRegion = config.get('awsRegion')
const awsAccessKeyID = config.get('awsAccessKeyID')
const awsSecretAccessKey = config.get('awsSecretAccessKey')
const bucketName = config.get('bucketName')

export const s3Client = new S3Client({
  region: awsRegion,
  credentials: {
    accessKeyId: awsAccessKeyID,
    secretAccessKey: awsSecretAccessKey,
  },
})

export const uploadToS3 = async (fileBuffer, fileName, mimeType) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimeType,
  })

  await s3Client.send(command)

  return `s3://${bucketName}/${fileName}`
}

export const getPresignedUrl = async (key) => {
  const bucketName = config.get('bucketName')

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 })
}

export const deleteFromS3 = async (key) => {
  const bucketName = config.get('bucketName')

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  await s3Client.send(command)
}
