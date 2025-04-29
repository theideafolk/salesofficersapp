// Utility functions for handling file uploads to Supabase storage
import { supabase } from '../lib/supabase';
import imageCompression from 'browser-image-compression';

// Constants for retry mechanism
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms
const STORAGE_CACHE_KEY = 'storage_bucket_cache';

// Image compression options
const compressionOptions = {
  maxSizeMB: 1,           // Max file size in MB (default = 1MB)
  maxWidthOrHeight: 1920, // Resize to max width/height if needed
  useWebWorker: true,     // Use WebWorker for better performance
  fileType: 'image/jpeg', // Convert to JPEG format for better compression
  initialQuality: 0.7     // Initial quality (0 to 1)
};

/**
 * Sleep function for delay between retries
 * @param ms Milliseconds to sleep
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Clear storage-related cache to avoid stale data
 */
const clearStorageCache = () => {
  try {
    localStorage.removeItem(STORAGE_CACHE_KEY);
    console.log('Storage cache cleared');
  } catch (err) {
    console.warn('Failed to clear storage cache:', err);
  }
};

/**
 * Check if bucket exists with retry mechanism
 * @param bucketName The name of the bucket to check
 * @returns Boolean indicating if bucket exists
 */
const checkBucketExists = async (bucketName: string): Promise<boolean> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Checking if bucket ${bucketName} exists (attempt ${attempt}/${MAX_RETRIES})...`);
      
      const { data: bucketList, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error(`Error listing buckets (attempt ${attempt}/${MAX_RETRIES}):`, error);
        
        if (attempt < MAX_RETRIES) {
          console.log(`Retrying in ${RETRY_DELAY}ms...`);
          await sleep(RETRY_DELAY);
          continue;
        }
        return false;
      }
      
      const exists = bucketList.some(bucket => bucket.name === bucketName);
      console.log(`Bucket ${bucketName} ${exists ? 'exists' : 'does not exist'}`);
      
      // Cache the result for future reference
      try {
        localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          buckets: bucketList.map(b => b.name)
        }));
      } catch (e) {
        // Ignore storage errors
      }
      
      return exists;
    } catch (err) {
      console.error(`Unexpected error checking bucket (attempt ${attempt}/${MAX_RETRIES}):`, err);
      
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY}ms...`);
        await sleep(RETRY_DELAY);
      }
    }
  }
  
  return false;
};

/**
 * Compresses an image file before uploading
 * @param file Original image file
 * @param options Compression options
 * @returns Compressed image file
 */
const compressImage = async (file: File, options = compressionOptions): Promise<File> => {
  try {
    console.log(`Compressing image: ${file.name} (${(file.size / 1024).toFixed(2)}KB)...`);
    
    // Determine if compression is needed (skip for small images)
    if (file.size <= options.maxSizeMB * 1024 * 1024) {
      console.log('Image already under size limit, skipping compression');
      return file;
    }
    
    // Perform compression
    const compressedFile = await imageCompression(file, options);
    
    console.log(`Compression complete: ${compressedFile.name} (${(compressedFile.size / 1024).toFixed(2)}KB)`);
    console.log(`Compression ratio: ${(file.size / compressedFile.size).toFixed(2)}x`);
    
    return compressedFile;
  } catch (error) {
    console.error('Error during image compression:', error);
    // If compression fails, return the original file
    return file;
  }
};

/**
 * Uploads a file to a specific bucket in Supabase storage
 * @param file The file to upload
 * @param bucketName The name of the bucket to upload to
 * @param path The path within the bucket (optional)
 * @param onProgress Progress callback function (optional)
 * @returns The public URL of the uploaded file or null if upload failed
 */
export const uploadFile = async (
  file: File, 
  bucketName: string,
  path: string = '',
  onProgress?: (progress: number) => void
): Promise<string | null> => {
  try {
    console.log(`Starting upload process to ${bucketName}/${path}...`);
    console.log(`Using Supabase URL: ${import.meta.env.VITE_SUPABASE_URL.substring(0, 20)}...`);
    
    // Clear any cache that might be causing issues
    clearStorageCache();
    
    // Check file size (5MB limit to match bucket config)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      console.log(`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds limit, will attempt compression`);
    }

    // Check if the bucket exists using retry mechanism
    const bucketExists = await checkBucketExists(bucketName);
    
    if (!bucketExists) {
      // As a fallback, try to directly upload anyway - the bucket might exist but listBuckets might fail
      console.log(`Bucket ${bucketName} not found in list, but attempting upload anyway as fallback...`);
    }
    
    // Check if the file is an image that needs compression
    let fileToUpload = file;
    if (file.type.startsWith('image/')) {
      fileToUpload = await compressImage(file);
      if (onProgress) {
        // Report compression progress (50%)
        onProgress(50);
      }
    }
    
    // Generate a unique filename with timestamp and random string
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2, 10);
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const fileName = `${path}${sanitizedName}_${timestamp}_${random}.${fileExt}`;
    
    console.log(`Prepared filename: ${fileName}`);
    
    // Determine content type based on file extension
    let contentType = fileToUpload.type;
    if (!contentType || contentType === 'application/octet-stream') {
      // Map common image extensions to MIME types
      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
      };
      
      contentType = mimeTypes[fileExt] || 'application/octet-stream';
    }
    
    console.log(`Using content type: ${contentType}`);
    
    // Implement retry mechanism for upload
    let uploadError = null;
    let uploadData = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Uploading file to ${bucketName}/${fileName} (attempt ${attempt}/${MAX_RETRIES})...`);
        
        // Upload the file with progress tracking
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(fileName, fileToUpload, {
            cacheControl: '3600',
            upsert: true,
            contentType,
            onUploadProgress: (progress) => {
              if (onProgress) {
                if (fileToUpload !== file) {
                  // If we compressed, then upload progress is the second half (50%-100%)
                  const percent = 50 + Math.round((progress.loaded / progress.total) * 50);
                  onProgress(percent);
                } else {
                  // No compression, so progress is 0-100%
                  const percent = Math.round((progress.loaded / progress.total) * 100);
                  onProgress(percent);
                }
              }
            }
          });
          
        if (error) {
          console.error(`Error uploading file (attempt ${attempt}/${MAX_RETRIES}):`, error);
          uploadError = error;
          
          if (attempt < MAX_RETRIES) {
            console.log(`Retrying in ${RETRY_DELAY}ms...`);
            await sleep(RETRY_DELAY);
            continue;
          }
        } else {
          uploadData = data;
          uploadError = null;
          break;
        }
      } catch (err) {
        console.error(`Unexpected error during upload (attempt ${attempt}/${MAX_RETRIES}):`, err);
        uploadError = err;
        
        if (attempt < MAX_RETRIES) {
          console.log(`Retrying in ${RETRY_DELAY}ms...`);
          await sleep(RETRY_DELAY);
        }
      }
    }
    
    if (uploadError) {
      throw uploadError;
    }
    
    if (!uploadData) {
      throw new Error('Upload failed after multiple retries');
    }
    
    console.log(`File uploaded successfully to ${bucketName}/${fileName}`);
    
    // Get the public URL with retry
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Getting public URL for ${bucketName}/${fileName} (attempt ${attempt}/${MAX_RETRIES})...`);
        
        const { data: publicUrlData } = await supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);
          
        if (publicUrlData && publicUrlData.publicUrl) {
          console.log(`Public URL obtained: ${publicUrlData.publicUrl.substring(0, 30)}...`);
          return publicUrlData.publicUrl;
        }
        
        console.error(`Failed to get public URL (attempt ${attempt}/${MAX_RETRIES})`);
        
        if (attempt < MAX_RETRIES) {
          console.log(`Retrying in ${RETRY_DELAY}ms...`);
          await sleep(RETRY_DELAY);
        }
      } catch (err) {
        console.error(`Error getting public URL (attempt ${attempt}/${MAX_RETRIES}):`, err);
        
        if (attempt < MAX_RETRIES) {
          console.log(`Retrying in ${RETRY_DELAY}ms...`);
          await sleep(RETRY_DELAY);
        }
      }
    }
    
    // If we got here, we couldn't get the public URL
    throw new Error('Failed to get public URL after multiple retries');
    
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * Upload a visit proof image to 'visit-proofs' bucket
 */
export const uploadVisitProofImage = async (
  file: File, 
  visitId: string,
  onProgress?: (progress: number) => void
): Promise<string | null> => {
  try {
    console.log(`Uploading visit proof image for visit ID: ${visitId}`);
    
    // Add visitId to path to organize by visit
    const path = `${visitId}/`;
    return await uploadFile(file, 'visit-proofs', path, onProgress);
  } catch (error) {
    console.error('Error uploading visit proof image:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to upload visit image');
  }
};

/**
 * Upload a shop photo to 'shop-photos' bucket
 */
export const uploadShopImage = async (
  file: File, 
  shopId: string,
  onProgress?: (progress: number) => void
): Promise<string | null> => {
  try {
    console.log(`Uploading shop image for shop ID: ${shopId}`);
    
    // Add shopId to path to organize by shop
    const path = `${shopId}/`;
    return await uploadFile(file, 'shop-photos', path, onProgress);
  } catch (error) {
    console.error('Error uploading shop image:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to upload shop image');
  }
};