const AWS = require('aws-sdk');
require('dotenv').config();

// Configure the AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  signatureVersion: 'v4'
});

// Create an S3 client instance with specific config
const s3 = new AWS.S3({
  signatureVersion: 'v4',
  region: process.env.AWS_REGION || 'us-east-2'
});

// Helper function to generate a pre-signed URL for an S3 object
const getSignedUrl = (bucket, key, expires = 604800) => { // Default: 1 week (sec)
  console.log(`Generating signed URL for bucket: ${bucket}, key: ${key}, expires: ${expires}`);
  
  try {
    const params = {
      Bucket: bucket,
      Key: key,
      Expires: expires
    };
    
    const url = s3.getSignedUrl('getObject', params);
    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

// Helper to construct a direct S3 URL if you know the bucket and region
const getDirectS3Url = (bucket, key, region = process.env.AWS_REGION) => {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

module.exports = {
  s3,
  getSignedUrl,
  getDirectS3Url
}; 