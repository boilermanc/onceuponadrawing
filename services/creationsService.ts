import { supabase } from './supabaseClient';
import { DrawingAnalysis } from '../types';
import { FREE_CREATION_LIMIT } from './creditsService';

// ============================================================================
// TYPES
// ============================================================================

export interface Creation {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  artist_name: string | null;
  artist_age: string | null;
  artist_grade: string | null;
  year: string | null;
  original_image_path: string;
  video_path: string;
  analysis_json: DrawingAnalysis;
  page_images: string[] | null;
  created_at: string;
  is_deleted: boolean;
  is_locked: boolean;
  thumbnail_url?: string;
}

export interface CreationWithSignedUrls extends Creation {
  original_image_url: string;
  video_url: string;
  page_image_urls: string[];
}

export interface CanSaveResult {
  canSave: boolean;
  reason?: 'limit_reached' | 'subscription_expired';
  savesUsed: number;
  limit: number;
}

export interface SaveCreationData {
  originalImage: string;
  videoUrl: string;
  analysis: DrawingAnalysis;
  pageImages: string[];
}

export interface SaveCreationResult {
  success: boolean;
  creationId?: string;
  error?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Upload data to a Supabase storage bucket
 */
async function uploadToStorage(
  bucket: string,
  path: string,
  data: Blob | string,
  contentType: string
): Promise<{ path: string | null; error: string | null }> {
  let uploadData: Blob;

  if (typeof data === 'string') {
    // Handle base64 string
    if (data.startsWith('data:')) {
      // Extract base64 content from data URL
      const base64Content = data.split(',')[1];
      const binaryString = atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      uploadData = new Blob([bytes], { type: contentType });
    } else {
      // Assume raw base64
      const binaryString = atob(data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      uploadData = new Blob([bytes], { type: contentType });
    }
  } else {
    uploadData = data;
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, uploadData, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error(`Failed to upload to ${bucket}/${path}:`, error);
    return { path: null, error: error.message };
  }

  return { path, error: null };
}

/**
 * Generate a unique file path with user ID prefix
 */
function generateStoragePath(userId: string, filename: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${userId}/${timestamp}-${randomSuffix}-${filename}`;
}

/**
 * Get a signed URL for a storage path
 */
async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error(`Failed to get signed URL for ${bucket}/${path}:`, error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Helper to check if an error is from an aborted request
 */
function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.includes('aborted');
  }
  return false;
}

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

/**
 * Get all creations for a user with is_locked computed field
 * Orders by created_at descending (newest first)
 * Includes thumbnail_url for the first page image
 */
export async function getCreations(userId: string, signal?: AbortSignal): Promise<Creation[]> {
  console.log('[getCreations] Calling RPC with userId:', userId);

  // Check if already aborted
  if (signal?.aborted) {
    console.log('[getCreations] Request already aborted');
    return [];
  }

  try {
    const query = supabase.rpc('get_accessible_creations', {
      user_uuid: userId,
    });

    // Add abort signal if provided
    const { data, error } = signal
      ? await query.abortSignal(signal)
      : await query;

    console.log('[getCreations] RPC response:', { data: data?.length, error });

    if (error) {
      if (isAbortError(error)) {
        console.log('[getCreations] Request aborted');
        return [];
      }
      console.error('[getCreations] Failed to get creations:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Check abort before thumbnail generation
    if (signal?.aborted) {
      return [];
    }

    // Generate thumbnail URLs for each creation
    const creationsWithThumbnails = await Promise.all(
      data.map(async (creation: Creation) => {
        if (creation.page_images && creation.page_images.length > 0 && !creation.is_locked) {
          const thumbnailUrl = await getSignedUrl('page-images', creation.page_images[0]);
          return { ...creation, thumbnail_url: thumbnailUrl || undefined };
        }
        return creation;
      })
    );

    return creationsWithThumbnails;
  } catch (err) {
    if (isAbortError(err)) {
      console.log('[getCreations] Request aborted');
      return [];
    }
    console.error('[getCreations] Unexpected error:', err);
    return [];
  }
}

/**
 * Check if a user can save a new creation based on their subscription status
 */
export async function canSaveCreation(userId: string, signal?: AbortSignal): Promise<CanSaveResult> {
  // Check if already aborted
  if (signal?.aborted) {
    return { canSave: false, reason: 'limit_reached', savesUsed: 0, limit: 3 };
  }

  // Call the database function
  const rpcQuery = supabase.rpc('can_user_save_creation', { user_uuid: userId });
  const { data: canSave, error: rpcError } = signal
    ? await rpcQuery.abortSignal(signal)
    : await rpcQuery;

  if (rpcError) {
    if (isAbortError(rpcError)) {
      return { canSave: false, reason: 'limit_reached', savesUsed: 0, limit: 3 };
    }
    console.error('Failed to check save eligibility:', rpcError);
    return {
      canSave: false,
      reason: 'limit_reached',
      savesUsed: 0,
      limit: 3,
    };
  }

  // Check abort before profile fetch
  if (signal?.aborted) {
    return { canSave: Boolean(canSave), savesUsed: 0, limit: 3 };
  }

  // Fetch user profile for detailed info
  let profileQuery = supabase
    .from('profiles')
    .select('free_saves_used, subscription_tier, subscription_expires_at')
    .eq('id', userId);

  if (signal) {
    profileQuery = profileQuery.abortSignal(signal);
  }

  const { data: profile, error: profileError } = await profileQuery.single();

  if (profileError) {
    if (isAbortError(profileError)) {
      return { canSave: Boolean(canSave), savesUsed: 0, limit: 3 };
    }
    console.error('Failed to fetch profile:', profileError);
    return {
      canSave: Boolean(canSave),
      savesUsed: 0,
      limit: 3,
    };
  }

  const isPremium =
    profile.subscription_tier === 'premium' &&
    profile.subscription_expires_at &&
    new Date(profile.subscription_expires_at) > new Date();

  const savesUsed = profile.free_saves_used || 0;
  const limit = isPremium ? Infinity : FREE_CREATION_LIMIT;

  // Determine reason if canSave is false
  let reason: 'limit_reached' | 'subscription_expired' | undefined;
  if (!canSave) {
    if (
      profile.subscription_tier === 'premium' &&
      profile.subscription_expires_at &&
      new Date(profile.subscription_expires_at) <= new Date()
    ) {
      reason = 'subscription_expired';
    } else {
      reason = 'limit_reached';
    }
  }

  return {
    canSave: Boolean(canSave),
    reason,
    savesUsed,
    limit,
  };
}

/**
 * Save a new creation including all assets to storage
 */
export async function saveCreation(
  userId: string,
  data: SaveCreationData
): Promise<SaveCreationResult> {
  // First verify the user can save
  const eligibility = await canSaveCreation(userId);
  if (!eligibility.canSave) {
    return {
      success: false,
      error: eligibility.reason || 'Cannot save creation',
    };
  }

  try {
    // Upload original image to drawings bucket
    const originalPath = generateStoragePath(userId, 'original.png');
    const originalResult = await uploadToStorage(
      'drawings',
      originalPath,
      data.originalImage,
      'image/png'
    );
    if (originalResult.error) {
      return { success: false, error: `Failed to upload original: ${originalResult.error}` };
    }

    // Fetch video blob and upload to videos bucket
    let videoBlob: Blob;
    try {
      const videoResponse = await fetch(data.videoUrl);
      videoBlob = await videoResponse.blob();
    } catch (fetchError) {
      return { success: false, error: 'Failed to fetch video' };
    }

    const videoPath = generateStoragePath(userId, 'story.mp4');
    const videoResult = await uploadToStorage(
      'outputs',
      videoPath,
      videoBlob,
      'video/mp4'
    );
    if (videoResult.error) {
      return { success: false, error: `Failed to upload video: ${videoResult.error}` };
    }

    // Upload page images to page-images bucket (in parallel for speed)
    const pageUploadPromises = data.pageImages.map(async (pageImage, i) => {
      const pagePath = generateStoragePath(userId, `page-${i + 1}.png`);
      const pageResult = await uploadToStorage(
        'page-images',
        pagePath,
        pageImage,
        'image/png'
      );
      if (pageResult.error) {
        throw new Error(`Failed to upload page ${i + 1}: ${pageResult.error}`);
      }
      return pagePath;
    });

    let pageImagePaths: string[];
    try {
      pageImagePaths = await Promise.all(pageUploadPromises);
    } catch (uploadError) {
      return { success: false, error: (uploadError as Error).message };
    }

    // Insert row into creations table
    const { data: creation, error: insertError } = await supabase
      .from('creations')
      .insert({
        user_id: userId,
        title: data.analysis.storyTitle,
        subject: data.analysis.subject,
        artist_name: data.analysis.artistName,
        artist_age: data.analysis.age,
        artist_grade: data.analysis.grade,
        year: data.analysis.year,
        original_image_path: originalPath,
        video_path: videoPath,
        analysis_json: data.analysis,
        page_images: pageImagePaths,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert creation:', insertError);
      return { success: false, error: 'Failed to save creation to database' };
    }

    // Credit deduction is handled separately by useCredit() in creditsService.ts
    return { success: true, creationId: creation.id };
  } catch (error) {
    console.error('Unexpected error saving creation:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Soft delete a creation by setting is_deleted = true
 */
export async function deleteCreation(
  userId: string,
  creationId: string
): Promise<boolean> {
  // Verify the creation belongs to the user and update it
  const { error: updateError } = await supabase
    .from('creations')
    .update({ is_deleted: true })
    .eq('id', creationId)
    .eq('user_id', userId);

  if (updateError) {
    console.error('Failed to delete creation:', updateError);
    return false;
  }

  // Decrement free_saves_used if user is on free tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_expires_at, free_saves_used')
    .eq('id', userId)
    .single();

  if (!profile) {
    return true; // Creation was deleted, profile fetch is non-critical
  }

  const isPremium =
    profile.subscription_tier === 'premium' &&
    profile.subscription_expires_at &&
    new Date(profile.subscription_expires_at) > new Date();

  if (!isPremium && profile.free_saves_used > 0) {
    const { error: decrementError } = await supabase
      .from('profiles')
      .update({ free_saves_used: profile.free_saves_used - 1 })
      .eq('id', userId);

    if (decrementError) {
      console.warn('Failed to decrement free_saves_used:', decrementError);
    }
  }

  return true;
}

/**
 * Get a single creation by ID with signed URLs for all assets
 * Returns null if not found, doesn't belong to user, or is locked
 */
export async function getCreation(
  userId: string,
  creationId: string,
  signal?: AbortSignal
): Promise<CreationWithSignedUrls | null> {
  // Get all accessible creations to check lock status
  const creations = await getCreations(userId, signal);
  const creation = creations.find((c) => c.id === creationId);

  if (!creation) {
    // Either doesn't exist, doesn't belong to user, or is deleted
    return null;
  }

  if (creation.is_locked) {
    // User cannot access this creation due to subscription limits
    return null;
  }

  // Generate signed URLs for all assets
  const originalImageUrl = await getSignedUrl('drawings', creation.original_image_path);
  const videoUrl = await getSignedUrl('outputs', creation.video_path);

  if (!originalImageUrl || !videoUrl) {
    console.error('Failed to generate signed URLs for creation assets');
    return null;
  }

  // Generate signed URLs for page images
  const pageImageUrls: string[] = [];
  if (creation.page_images && Array.isArray(creation.page_images)) {
    for (const pagePath of creation.page_images) {
      const pageUrl = await getSignedUrl('page-images', pagePath);
      if (pageUrl) {
        pageImageUrls.push(pageUrl);
      }
    }
  }

  return {
    ...creation,
    original_image_url: originalImageUrl,
    video_url: videoUrl,
    page_image_urls: pageImageUrls,
  };
}
