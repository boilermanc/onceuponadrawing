
import { supabase } from './supabaseClient';
import { DrawingAnalysis, Order, ProductType, ShippingInfo } from '../types';

const getMimeTypeFromBase64 = (base64: string): string => {
  const match = base64.match(/^data:(.+?);base64,/);
  return match ? match[1] : 'image/png';
};

export const uploadFile = async (bucket: string, path: string, base64Data: string) => {
  const mimeType = getMimeTypeFromBase64(base64Data);
  const byteString = atob(base64Data.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeType });

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: mimeType, upsert: true });

  if (error) throw error;
  
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year expiry

  if (signedUrlError || !signedUrlData?.signedUrl) {
    throw new Error('Failed to generate signed URL');
  }
  return signedUrlData.signedUrl;
};

export const saveDrawing = async (userId: string, imageUrl: string, analysis: DrawingAnalysis) => {
  const { data, error } = await supabase
    .from('drawings')
    .insert({
      user_id: userId,
      original_image_url: imageUrl,
      analysis: analysis
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateDrawingVideo = async (drawingId: string, videoUrl: string) => {
  const { error } = await supabase
    .from('drawings')
    .update({ video_url: videoUrl })
    .eq('id', drawingId);

  if (error) throw error;
};

export const createOrder = async (userId: string, drawingId: string | undefined, productType: ProductType, amount: number, shipping: ShippingInfo | null) => {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      drawing_id: drawingId,
      product_type: productType,
      total_amount: amount,
      status: 'payment_received',
      shipping_info: shipping
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getProfile = async (userId: string, signal?: AbortSignal) => {
  let query = supabase
    .from('profiles')
    .select('*')
    .eq('id', userId);

  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data, error } = await query.single();

  if (error) return null;
  return data;
};

export const updateProfile = async (userId: string, updates: any) => {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  
  if (error) throw error;
};
