const UserModel = require('../models/user');
console.log('User model imported:', Object.keys(UserModel));

const { s3, getSignedUrl, getDirectS3Url } = require('../config/s3');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

// --- Multer Configuration for Avatar Upload ---

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif', // allow gifs? not sure, but for now will keep
  'image/webp': '.webp'
};

const storage = multer.memoryStorage(); // Store file in memory before uploading to S3

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
}).single('avatar');

// --- Controller Functions ---

// Update user bio
exports.updateBio = async (req, res) => {
  const { bio } = req.body;
  const userId = req.user.id;

  if (typeof bio !== 'string') {
    return res.status(400).json({ message: 'Invalid bio data.' });
  }

  try {
    const updatedUser = await UserModel.updateBio(userId, bio.trim());
    res.json({ 
        message: 'Bio updated successfully', 
        user: { // Return only necessary fields, including the updated bio
            id: updatedUser.id,
            netid: updatedUser.netid,
            bio: updatedUser.bio,
            avatar_url: updatedUser.avatar_url 
        }
    });
  } catch (error) {
    console.error('Error updating bio:', error);
    if (error.message === 'User not found') {
        return res.status(404).json({ message: 'User not found.' });
    }
    res.status(500).json({ message: 'Error updating bio.' });
  }
};

// Handle avatar upload
exports.uploadAvatar = (req, res) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      // Handle Multer errors (ex: file size limit)
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      // Handle other errors (ex: invalid file type)
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No avatar file provided.' });
    }

    const userId = req.user.id;
    const netid = req.user.netid;
    const file = req.file;
    const fileExtension = ALLOWED_MIME_TYPES[file.mimetype];
    const fileName = `avatars/${netid}-${Date.now()}${fileExtension}`;
    const bucketName = process.env.S3_BUCKET_NAME;

    if (!bucketName) {
        console.error('S3_BUCKET_NAME environment variable is not set.');
        return res.status(500).json({ message: 'Server configuration error.' });
    }

    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: file.buffer,          // Use buffer from multer.memoryStorage
      ContentType: file.mimetype
    };

    try {
      console.log('Attempting S3 upload with params:', {
        bucket: params.Bucket,
        key: params.Key,
        contentType: params.ContentType,
        fileSize: file.size
      });
      
      const s3UploadResult = await s3.upload(params).promise();
      
      // Get the uploaded file URL - first try direct URL, fallback to signed URL if needed
      let avatarUrl = s3UploadResult.Location;
      
      // console.log('Successfully uploaded to S3:', s3UploadResult);
      // console.log('Raw S3 URL:', avatarUrl);
      
      // Try diff ways to get a working URL just incase standard one doesn't work
      // this is so scuffed but im not very educated on this? ,,, i mean it works
      // and im too egotistic to ask for ai help and then have to use a disclaimer 
      if (!avatarUrl || avatarUrl.includes('s3.amazonaws.com')) {
        // First try a direct S3 URL 
        const directUrl = getDirectS3Url(bucketName, fileName);
        console.log('Constructed direct S3 URL:', directUrl);
        avatarUrl = directUrl;
        
        // Also generate pre-signed URL as a backup approach
        try {
          const signedUrl = getSignedUrl(bucketName, fileName);
          console.log('Generated pre-signed URL:', signedUrl);
          // use direct URL by default, but can switch to signed URL if needed
          // avatarUrl = signedUrl; 
        } catch (signUrlError) {
          console.error('Error generating signed URL:', signUrlError);
        }
      }

      console.log('Final avatar URL to save:', avatarUrl);

      // Save the URL to the database
      const updatedUser = await UserModel.updateAvatarUrl(userId, avatarUrl);

      res.json({ 
          message: 'Avatar uploaded successfully', 
          user: { // Return only necessary fields + the new avatar URL
              id: updatedUser.id,
              netid: updatedUser.netid,
              bio: updatedUser.bio,
              avatar_url: updatedUser.avatar_url 
          }
      });

    } catch (error) {
      console.error('Error uploading to S3 or updating database:', error);
      console.error('Upload parameters:', {
        bucket: params.Bucket,
        key: params.Key,
        contentType: params.ContentType
      });
      if (error.message === 'User not found') {
          return res.status(404).json({ message: 'User not found.' });
      }
      res.status(500).json({ message: 'Error processing avatar upload.' });
    }
  });
}; 