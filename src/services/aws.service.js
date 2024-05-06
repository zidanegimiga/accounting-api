const { BUCKET_NAME, SECRET_ID_AWS, SECRET_KEY_AWS, AWS_REGION } = process.env;
const S3 = require('aws-sdk/clients/s3');
const fs = require('fs');

const s3 = new S3({
  accessKeyId: SECRET_ID_AWS,
  secretAccessKey: SECRET_KEY_AWS,
  region: AWS_REGION,
});

const uploadFileToS3 = async ({ filePath, fileName, fileMimeType }) => {
  const fileStream = fs.createReadStream(filePath);

  const uploadParams = {
    Bucket: BUCKET_NAME,
    Body: fileStream,
    Key: fileName,
    ACL: 'public-read',
    ContentType: fileMimeType,
  };

  return s3.upload(uploadParams).promise();
};

const getFileStreamFromS3 = async (fileKey) => {
  const downloadParams = {
    Key: fileKey,
    Bucket: BUCKET_NAME,
  };

  return s3.getObject(downloadParams).createReadStream();
};

module.exports = {
  uploadFileToS3,
  getFileStreamFromS3,
};
