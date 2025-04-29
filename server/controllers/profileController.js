const UserModel = require('../models/user');
console.log('User model imported:', Object.keys(UserModel));

const { s3, getSignedUrl, getDirectS3Url } = require('../config/s3');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
const sharp = require('sharp');

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
        // We'll handle oversized files in the next section
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
    
    // Check if file is over the limit and needs compression
    const isOverSizeLimit = file.size > MAX_FILE_SIZE;
    if (isOverSizeLimit) {
      console.log(`File size ${file.size / (1024 * 1024)}MB exceeds limit, attempting compression...`);
    }
    
    const fileExtension = ALLOWED_MIME_TYPES[file.mimetype];
    // Compress image to reduce size and improve load times
    let bufferToUpload = file.buffer;
    try {
      // Start with normal compression for all images
      let quality = isOverSizeLimit ? 70 : 80; // Lower initial quality for oversized images
      let compressionLevel = isOverSizeLimit ? 9 : 8; // Higher compression for PNGs if oversized
      
      // Try compressing with progressively lower quality until under size limit
      let attempts = 0;
      const maxAttempts = 5; // Limit the number of compression attempts
      const minQuality = 40; // Don't go below this quality
      
      while (true) {
        // Apply compression based on image type
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
          bufferToUpload = await sharp(file.buffer)
            .jpeg({ quality })
            .toBuffer();
        } else if (file.mimetype === 'image/png') {
          bufferToUpload = await sharp(file.buffer)
            .png({ compressionLevel })
            .toBuffer();
        } else if (file.mimetype === 'image/webp') {
          bufferToUpload = await sharp(file.buffer)
            .webp({ quality })
            .toBuffer();
        } else if (file.mimetype === 'image/gif') {
          // GIFs can't be easily compressed with sharp, but we can convert to PNG if needed
          if (isOverSizeLimit) {
            console.log('Converting GIF to compressed PNG...');
            bufferToUpload = await sharp(file.buffer, { animated: false })
              .png({ compressionLevel })
              .toBuffer();
            // Change file type for upload
            file.mimetype = 'image/png';
          } else {
            bufferToUpload = file.buffer; // Keep GIF as is if under size limit
          }
          break; // Always break for GIFs since we're either converting or keeping as is
        }
        
        // Check if we're under the size limit now
        if (!isOverSizeLimit || bufferToUpload.length <= MAX_FILE_SIZE || attempts >= maxAttempts || quality <= minQuality) {
          break;
        }
        
        // Reduce quality for next attempt
        attempts++;
        quality = Math.max(minQuality, quality - 10);
        compressionLevel = Math.min(9, compressionLevel + 1);
        console.log(`Compression attempt ${attempts}: quality=${quality}, size=${bufferToUpload.length / (1024 * 1024)}MB`);
      }
      
      // Final size check
      if (bufferToUpload.length > MAX_FILE_SIZE) {
        console.log(`Failed to compress image below ${MAX_FILE_SIZE / (1024 * 1024)}MB limit. Final size: ${bufferToUpload.length / (1024 * 1024)}MB`);
        return res.status(400).json({ message: `Could not compress image below ${MAX_FILE_SIZE / (1024 * 1024)}MB. Please use a smaller image.` });
      }
      
      console.log(`Final compressed size: ${bufferToUpload.length / (1024 * 1024)}MB`);
    } catch (compressError) {
      console.error('Error compressing avatar image:', compressError);
      // If compression fails and file is too large, reject the upload
      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ message: `File too large (${file.size / (1024 * 1024)}MB) and compression failed. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` });
      }
      // Otherwise use the original buffer
      bufferToUpload = file.buffer;
    }
    const fileName = `avatars/${netid}-${Date.now()}${fileExtension}`;
    const bucketName = process.env.S3_BUCKET_NAME;

    if (!bucketName) {
        console.error('S3_BUCKET_NAME environment variable is not set.');
        return res.status(500).json({ message: 'Server configuration error.' });
    }

    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: bufferToUpload,       // Use compressed image buffer
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

// Mark the tutorial as completed for the logged-in user
exports.markTutorialComplete = async (req, res) => {
  const userId = req.user.id;

  if (!userId) {
    // This should technically be caught by ensureAuthenticated, but good practice
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const result = await UserModel.markTutorialAsCompleted(userId);
    if (!result) {
      // Handle case where user doesn't exist (shouldn't happen if authenticated)
      return res.status(404).json({ message: 'User not found.' });
    }
    // Successfully updated the flag
    console.log(`User ${userId} marked tutorial as complete.`);
    // Send back minimal confirmation, perhaps updated user flag status if needed by frontend
    res.status(200).json({ 
        message: 'Tutorial marked as complete.', 
        user: { 
            id: result.id, 
            has_completed_tutorial: result.has_completed_tutorial 
        }
    }); 
  } catch (error) {
    console.error(`Error marking tutorial complete for user ${userId}:`, error);
    res.status(500).json({ message: 'Error updating tutorial completion status.' });
  }
}; 
// Update user's selected title
exports.updateTitle = async (req, res) => {
  const userId = req.user.id;
  const { titleId } = req.body;
  if (!titleId) {
    return res.status(400).json({ message: 'Title ID is required.' });
  }
  try {
    // Verify user has this title unlocked
    const userTitles = await UserModel.getTitles(userId);
    if (!userTitles.some(t => t.id === titleId)) {
      return res.status(400).json({ message: 'Title not available to user.' });
    }
    const result = await UserModel.updateTitle(userId, titleId);
    res.json({ selected_title_id: result.selected_title_id });
  } catch (error) {
    console.error(`Error updating selected title for user ${userId}:`, error);
    res.status(500).json({ message: 'Error updating selected title.' });
  }
};