// Utility functions for handling file uploads to Supabase storage
import { supabase } from '../lib/supabase';

// Constants for retry mechanism
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms
const STORAGE_CACHE_KEY = 'storage_bucket_cache';

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
      throw new Error(`File size exceeds limit of 5MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    }

    // Check if the bucket exists using retry mechanism
    const bucketExists = await checkBucketExists(bucketName);
    
    if (!bucketExists) {
      // As a fallback, try to directly upload anyway - the bucket might exist but listBuckets might fail
      console.log(`Bucket ${bucketName} not found in list, but attempting upload anyway as fallback...`);
    }
    
    // Generate a unique filename with timestamp and random string
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2, 10);
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const fileName = `${path}${sanitizedName}_${timestamp}_${random}.${fileExt}`;
    
    console.log(`Prepared filename: ${fileName}`);
    
    // Determine content type based on file extension
    let contentType = file.type;
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
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
            contentType,
            onUploadProgress: (progress) => {
              if (onProgress) {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                onProgress(percent);
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