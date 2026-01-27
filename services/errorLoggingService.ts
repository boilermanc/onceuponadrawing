import { supabase } from './supabaseClient';

export const logError = async (
  errorType: string,
  errorMessage: string,
  context?: object,
  drawingId?: string
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('error_logs').insert({
      user_id: user?.id ?? null,
      error_type: errorType,
      error_message: errorMessage,
      context: context ?? null,
      drawing_id: drawingId ?? null,
    });
  } catch (err) {
    console.error('Failed to log error:', err);
  }
};
