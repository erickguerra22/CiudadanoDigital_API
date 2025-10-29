import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
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
