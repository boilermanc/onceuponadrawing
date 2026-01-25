import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import Button from './ui/Button';

const ADMIN_EMAIL = 'team@sproutify.app';

interface BookOrder {
  id: string;
  user_id: string;
  creation_id: string;
  order_type: 'ebook' | 'hardcover';
  status: string;
  dedication_text: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_paid: number;
  shipping_name: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  shipping_country: string | null;
  shipping_email: string | null;
  lulu_order_id: string | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
}

interface Creation {
  id: string;
  user_id: string;
  title: string;
  artist_name: string;
  age: string | null;
  year: string | null;
  dedication_text: string | null;
  original_image_url: string;
  hero_image_url: string | null;
  story_pages: any[];
  page_images?: string[];
  original_image_path?: string;
  is_featured?: boolean;
  featured_at?: string;
  featured_thumbnail_url?: string;
  featured_page_url?: string;
  featured_pages?: { url: string; text: string }[];
  thumbnail_url?: string;
  analysis_json?: {
    pages?: { text: string; imageUrl?: string }[];
    artistAge?: string;
  };
  created_at: string;
}

interface PreviewResult {
  success: boolean;
  creation?: {
    id: string;
    title: string;
    artistName: string;
  };
  pdfs?: {
    interior: {
      url: string;
      sizeMB: number;
    };
    cover: {
      url: string;
      sizeMB: number;
    };
  };
  specs?: {
    pageCount: number;
    format: string;
    binding: string;
    interior: {
      dimensions: string;
      resolution: string;
      dpi: number;
      bleed: string;
    };
    cover: {
      dimensions: string;
      resolution: string;
      dpi: number;
      spineWidth: string;
      layout: string;
    };
  };
  expiresAt?: string;
  error?: string;
  details?: string;
}

interface AdminDashboardProps {
  userEmail: string | null;
  isAuthenticated: boolean;
  onLogin: () => void;
  onBack: () => void;
  onLogout: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  payment_received: { bg: 'bg-blue-100', text: 'text-blue-800' },
  processing: { bg: 'bg-purple-100', text: 'text-purple-800' },
  printed: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  shipped: { bg: 'bg-green-100', text: 'text-green-800' },
  delivered: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
};

interface LuluTestResult {
  success: boolean;
  message?: string;
  environment?: 'sandbox' | 'production';
  apiUrl?: string;
  totalPrintJobs?: number;
  preview?: unknown[];
  error?: string;
  details?: string;
}

interface LuluWebhook {
  id: number;
  url: string;
  topics: string[];
  is_active: boolean;
  created_at?: string;
}

interface WebhookSubmission {
  id: number;
  webhook_id: number;
  topic: string;
  response_status_code?: number;
  created_at: string;
}

interface WebhookManagementResult {
  success: boolean;
  environment?: string;
  apiUrl?: string;
  webhooks?: LuluWebhook[];
  recentSubmissions?: WebhookSubmission[];
  webhook?: LuluWebhook;
  message?: string;
  error?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  userEmail,
  isAuthenticated,
  onLogin,
  onBack,
  onLogout,
}) => {
  const [orders, setOrders] = useState<BookOrder[]>([]);
  const [creations, setCreations] = useState<Creation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<BookOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'preview' | 'settings' | 'gallery'>('orders');

  // Gallery state
  const [featureLoading, setFeatureLoading] = useState<string | null>(null);
  const [featureMessage, setFeatureMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [gallerySearch, setGallerySearch] = useState('');
  const [gallerySortBy, setGallerySortBy] = useState<'created_at' | 'title' | 'artist_name'>('created_at');
  const [gallerySortOrder, setGallerySortOrder] = useState<'asc' | 'desc'>('desc');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Lulu API test state
  const [luluTestLoading, setLuluTestLoading] = useState(false);
  const [luluTestResult, setLuluTestResult] = useState<LuluTestResult | null>(null);

  // Webhook management state
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookData, setWebhookData] = useState<WebhookManagementResult | null>(null);
  const [webhookActionLoading, setWebhookActionLoading] = useState<string | null>(null);
  const [webhookMessage, setWebhookMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preview state
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [previewResults, setPreviewResults] = useState<Map<string, PreviewResult>>(new Map());
  const [selectedBookTypes, setSelectedBookTypes] = useState<Map<string, string>>(new Map()); // creationId -> bookType
  const [bookPrices, setBookPrices] = useState<{
    softcover?: { amount: number; displayPrice: string };
    hardcover?: { amount: number; displayPrice: string };
  }>({});

  // Local auth state check (independent of prop)
  const [localAuthState, setLocalAuthState] = useState<{ isAuthenticated: boolean; email: string | null }>({
    isAuthenticated: isAuthenticated,
    email: userEmail,
  });

  // Function to refresh auth state
  const refreshAuthState = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const email = session.user.email || null;
      setLocalAuthState({
        isAuthenticated: true,
        email: email,
      });
      return true;
    } else {
      setLocalAuthState({
        isAuthenticated: false,
        email: null,
      });
      return false;
    }
  };

  // Check auth session directly
  useEffect(() => {
    refreshAuthState();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AdminDashboard] Auth state changed:', _event, session?.user?.email);
      if (session?.user) {
        const email = session.user.email || null;
        setLocalAuthState({
          isAuthenticated: true,
          email: email,
        });
        // Reset login loading if auth state changed to authenticated
        setLoginLoading(false);
        setLoginError(null);
      } else {
        setLocalAuthState({
          isAuthenticated: false,
          email: null,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Use local auth state if prop is not available
  const effectiveIsAuthenticated = localAuthState.isAuthenticated || isAuthenticated;
  const effectiveEmail = localAuthState.email || userEmail;
  const isAdmin = effectiveEmail === ADMIN_EMAIL;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      console.log('[AdminDashboard] Starting login process...');
      
      // Clear any stale session before login
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        console.log('[AdminDashboard] Clearing existing session...');
        await supabase.auth.signOut();
        // Wait a bit for signout to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('[AdminDashboard] Attempting sign in...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        console.error('[AdminDashboard] Login error:', error);
        setLoginError(error.message);
        setLoginLoading(false);
        return;
      }

      // Verify session was created
      if (!data.session) {
        console.error('[AdminDashboard] No session after login');
        setLoginError('Login succeeded but no session was created. Please try again.');
        setLoginLoading(false);
        return;
      }

      console.log('[AdminDashboard] Login successful, waiting for auth state...');
      
      // Wait for auth state to propagate (with timeout)
      let authStateUpdated = false;
      const checkAuthState = () => {
        const check = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            authStateUpdated = true;
            console.log('[AdminDashboard] Auth state updated successfully');
          }
        };
        check();
      };
      
      // Check immediately and then periodically
      checkAuthState();
      const checkInterval = setInterval(checkAuthState, 100);
      
      // Wait up to 2 seconds for auth state to update
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (authStateUpdated) break;
      }
      
      clearInterval(checkInterval);
      
      // Verify we have a session
      const { data: verifySession } = await supabase.auth.getSession();
      if (!verifySession?.session) {
        console.error('[AdminDashboard] Session verification failed');
        setLoginError('Session verification failed. Please try again.');
        setLoginLoading(false);
        return;
      }

      console.log('[AdminDashboard] Login complete, session verified');
      
      // Manually refresh auth state to ensure UI updates immediately
      await refreshAuthState();
      
      // Success - auth state listener will update the UI
      // Reset loading state
      setLoginLoading(false);
      
      // Clear form on success
      setLoginEmail('');
      setLoginPassword('');
    } catch (err: any) {
      console.error('[AdminDashboard] Login exception:', err);
      setLoginError(err.message || 'An unexpected error occurred');
      setLoginLoading(false);
    }
  };

  // Fetch book prices from Stripe
  const fetchBookPrices = async () => {
    try {
      console.log('[AdminDashboard] Fetching book prices from Stripe...');
      const { data, error } = await supabase.functions.invoke('get-book-prices');
      
      if (error) {
        console.error('[AdminDashboard] Error fetching book prices:', error);
        return;
      }
      
      console.log('[AdminDashboard] Book prices received:', data);
      setBookPrices({
        softcover: data?.softcover,
        hardcover: data?.hardcover,
      });
    } catch (err) {
      console.error('[AdminDashboard] Failed to fetch book prices:', err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
      if (activeTab === 'preview' || activeTab === 'gallery') {
        fetchCreations();
        if (activeTab === 'preview') {
          fetchBookPrices(); // Fetch prices when preview tab is active
        }
      }
    }
  }, [isAdmin, activeTab]);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('book_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setOrders(data || []);
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCreations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[AdminDashboard] Fetching creations...');
      const { data, error: fetchError, count } = await supabase
        .from('creations')
        .select('*, is_featured, featured_at, featured_thumbnail_url, featured_page_url, featured_pages, analysis_json', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(50); // Limit to most recent 50 creations

      console.log('[AdminDashboard] Creations query result:', { 
        count: data?.length, 
        error: fetchError,
        firstCreation: data?.[0],
        featuredCount: data?.filter(c => c.is_featured).length
      });

      if (fetchError) {
        console.error('[AdminDashboard] Query error:', fetchError);
        throw fetchError;
      }
      
      console.log(`[AdminDashboard] Found ${data?.length || 0} creations, ${data?.filter(c => c.is_featured).length} featured`);
      
      // Generate public URLs for thumbnails
      if (data && data.length > 0) {
        const creationsWithThumbnails = data.map((creation) => {
          // Try to get the first page image as thumbnail from outputs bucket
          if (creation.page_images && creation.page_images.length > 0) {
            const pagePath = creation.page_images[0];
            console.log('[AdminDashboard] Getting thumbnail for creation:', creation.id, 'from outputs bucket, path:', pagePath);
            
            // Get public URL from outputs bucket
            const { data: { publicUrl } } = supabase.storage
              .from('outputs')
              .getPublicUrl(pagePath);
            
            console.log('[AdminDashboard] Generated thumbnail URL:', publicUrl);
            return { ...creation, thumbnail_url: publicUrl };
          }
          
          // Return creation without thumbnail if no page_images
          console.warn('[AdminDashboard] No page_images found for creation:', creation.id, creation.title);
          return creation;
        });
        
        setCreations(creationsWithThumbnails);
      } else {
        setCreations(data || []);
      }
    } catch (err: any) {
      console.error('[AdminDashboard] Failed to fetch creations:', err);
      setError(err.message || 'Failed to fetch creations');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const truncateId = (id: string) => {
    return `${id.slice(0, 8)}...`;
  };

  const testLuluConnection = async () => {
    setLuluTestLoading(true);
    setLuluTestResult(null);
    try {
      // Call without auth headers since this function doesn't require JWT
      const response = await fetch(
        `${process.env.SUPABASE_URL}/functions/v1/test-lulu`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      const data = await response.json();
      setLuluTestResult(data as LuluTestResult);
    } catch (err: unknown) {
      setLuluTestResult({
        success: false,
        error: 'Unexpected error',
        details: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLuluTestLoading(false);
    }
  };

  // Webhook management functions
  const fetchWebhooks = async () => {
    setWebhookLoading(true);
    setWebhookMessage(null);
    try {
      const response = await fetch(
        `${process.env.SUPABASE_URL}/functions/v1/manage-lulu-webhooks`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      const data = await response.json();
      setWebhookData(data as WebhookManagementResult);
    } catch (err: unknown) {
      setWebhookData({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setWebhookLoading(false);
    }
  };

  const registerWebhook = async () => {
    setWebhookActionLoading('register');
    setWebhookMessage(null);
    try {
      // Build the callback URL for our webhook endpoint
      const callbackUrl = `${process.env.SUPABASE_URL}/functions/v1/lulu-webhook`;

      const response = await fetch(
        `${process.env.SUPABASE_URL}/functions/v1/manage-lulu-webhooks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'register',
            callback_url: callbackUrl,
          }),
        }
      );
      const data = await response.json();

      if (data.success) {
        setWebhookMessage({ type: 'success', text: 'Webhook registered successfully!' });
        fetchWebhooks(); // Refresh the list
      } else {
        setWebhookMessage({ type: 'error', text: data.error || 'Failed to register webhook' });
      }
    } catch (err: unknown) {
      setWebhookMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setWebhookActionLoading(null);
    }
  };

  const testWebhook = async (webhookId: number) => {
    setWebhookActionLoading(`test-${webhookId}`);
    setWebhookMessage(null);
    try {
      const response = await fetch(
        `${process.env.SUPABASE_URL}/functions/v1/manage-lulu-webhooks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'test',
            webhook_id: webhookId,
          }),
        }
      );
      const data = await response.json();

      if (data.success) {
        setWebhookMessage({ type: 'success', text: 'Test webhook sent! Check submissions below.' });
        // Refresh to show new submission
        setTimeout(() => fetchWebhooks(), 2000);
      } else {
        setWebhookMessage({ type: 'error', text: data.error || 'Failed to send test webhook' });
      }
    } catch (err: unknown) {
      setWebhookMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setWebhookActionLoading(null);
    }
  };

  const deleteWebhook = async (webhookId: number) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    setWebhookActionLoading(`delete-${webhookId}`);
    setWebhookMessage(null);
    try {
      const response = await fetch(
        `${process.env.SUPABASE_URL}/functions/v1/manage-lulu-webhooks`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhook_id: webhookId,
          }),
        }
      );
      const data = await response.json();

      if (data.success) {
        setWebhookMessage({ type: 'success', text: 'Webhook deleted successfully' });
        fetchWebhooks(); // Refresh the list
      } else {
        setWebhookMessage({ type: 'error', text: data.error || 'Failed to delete webhook' });
      }
    } catch (err: unknown) {
      setWebhookMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setWebhookActionLoading(null);
    }
  };

  const generatePreview = async (creationId: string) => {
    setPreviewLoading(creationId);
    try {
      const bookType = selectedBookTypes.get(creationId) || 'softcover';
      console.log('[AdminDashboard] Generating preview for creation:', creationId, 'type:', bookType);
      
      // Get the current session to pass auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }
      
      console.log('[AdminDashboard] Invoking function with auth token');
      const { data, error } = await supabase.functions.invoke('generate-book-preview', {
        body: { creationId, bookType },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // Handle error response (500 status codes still return data with error info)
      if (error) {
        console.error('[AdminDashboard] Preview generation error:', error);
        
        // Try to extract error details from the response
        let errorMessage = 'Failed to generate preview';
        let errorDetails = error.message || 'Unknown error';
        
        // If data contains error info (even on 500 errors, data might be populated)
        if (data && typeof data === 'object') {
          if ('error' in data) {
            errorMessage = String(data.error) || errorMessage;
          }
          if ('details' in data) {
            errorDetails = String(data.details) || errorDetails;
          }
        }
        
        // Check if error object has context
        if (error.context) {
          errorDetails = error.context.message || errorDetails;
        }
        
        setPreviewResults((prev) =>
          new Map(prev).set(creationId, {
            success: false,
            error: errorMessage,
            details: errorDetails,
          })
        );
        return;
      }

      // Verify response has expected structure
      if (!data) {
        throw new Error('No data returned from preview generation');
      }
      
      if (data.success === false) {
        const errorMsg = data?.error || 'Unknown error occurred';
        const errorDetails = data?.details || '';
        setPreviewResults((prev) =>
          new Map(prev).set(creationId, {
            success: false,
            error: errorMsg,
            details: errorDetails,
          })
        );
        return;
      }

      // Success - store result
      console.log('[AdminDashboard] Preview generated successfully');
      setPreviewResults((prev) => new Map(prev).set(creationId, data));
    } catch (err: any) {
      console.error('[AdminDashboard] Failed to generate preview:', err);
      const errorMessage = err.message || 'Failed to generate preview';
      const errorDetails = err.details || err.toString();
      
      setPreviewResults((prev) =>
        new Map(prev).set(creationId, {
          success: false,
          error: errorMessage,
          details: errorDetails,
        })
      );
    } finally {
      setPreviewLoading(null);
    }
  };

  const handleFeatureCreation = async (creation: Creation) => {
    setFeatureLoading(creation.id);
    setFeatureMessage(null);
    
    // Give React a moment to render the loading state
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      if (!creation.page_images || creation.page_images.length === 0) {
        throw new Error('No page images available for this creation');
      }

      console.log('[AdminDashboard] Featuring creation:', creation.id);
      console.log('[AdminDashboard] Raw page_images array:', creation.page_images);
      console.log('[AdminDashboard] analysis_json:', creation.analysis_json);

      // Upload up to 4 page images from the page_images array
      const pagesToUpload = creation.page_images.slice(0, 4);
      const featuredPages: { url: string; text: string }[] = [];

      for (let i = 0; i < pagesToUpload.length; i++) {
        const pagePath = pagesToUpload[i];

        console.log(`[AdminDashboard] Processing page ${i}:`);
        console.log(`  - Raw path: "${pagePath}"`);

        try {
          // Download the image from page-images bucket using authenticated download
          console.log(`  - Downloading from page-images bucket (authenticated)...`);
          const { data: imageData, error: downloadError } = await supabase.storage
            .from('page-images')
            .download(pagePath);

          if (downloadError || !imageData) {
            console.warn(`  ❌ Failed to download page ${i}:`, downloadError?.message || 'No data returned');
            continue;
          }

          const imageBlob = imageData;
          console.log(`  ✓ Downloaded (${imageBlob.size} bytes, type: ${imageBlob.type})`);

          // Upload to public-gallery bucket with indexed name
          const fileName = `${creation.id}-page-${i}.webp`;

          console.log(`  - Uploading to public-gallery as: ${fileName}`);
          const { error: uploadError } = await supabase.storage
            .from('public-gallery')
            .upload(fileName, imageBlob, {
              contentType: imageBlob.type || 'image/webp',
              upsert: true, // Overwrite if exists
            });

          if (uploadError) {
            console.warn(`  ❌ Failed to upload page ${i}:`, uploadError);
            continue;
          }

          // Get the public URL
          const { data: { publicUrl } } = supabase.storage
            .from('public-gallery')
            .getPublicUrl(fileName);

          // Get the corresponding text from analysis_json.pages
          const pageText = creation.analysis_json?.pages?.[i]?.text || '';
          console.log(`  - Page text: "${pageText.substring(0, 50)}${pageText.length > 50 ? '...' : ''}"`);

          featuredPages.push({
            url: publicUrl,
            text: pageText,
          });
          console.log(`  ✓ Uploaded successfully! Public URL: ${publicUrl}`);
        } catch (fetchError: any) {
          console.warn(`  ❌ Error processing page ${i}:`, fetchError.message);
          continue;
        }
      }

      if (featuredPages.length === 0) {
        throw new Error('Failed to upload any page images. Check console for details.');
      }

      console.log('[AdminDashboard] ✓ Successfully uploaded', featuredPages.length, 'page images with text');
      console.log('[AdminDashboard] Featured pages:', featuredPages);

      // Update the creation record
      const { error: updateError } = await supabase
        .from('creations')
        .update({
          is_featured: true,
          featured_at: new Date().toISOString(),
          featured_thumbnail_url: featuredPages[0].url, // First page for gallery grid
          featured_page_url: featuredPages[0].url, // Keep for backward compatibility
          featured_pages: featuredPages, // All uploaded pages with text
        })
        .eq('id', creation.id);

      if (updateError) throw updateError;

      console.log('[AdminDashboard] ✓ Creation featured successfully in database');

      // Refresh creations list before clearing loading state
      await fetchCreations();

      setFeatureMessage({ type: 'success', text: `"${creation.title}" has been featured with ${featuredPages.length} pages!` });

      // Clear success message after 3 seconds
      setTimeout(() => setFeatureMessage(null), 3000);
    } catch (err: any) {
      console.error('[AdminDashboard] ❌ Failed to feature creation:', err);
      setFeatureMessage({ type: 'error', text: err.message || 'Failed to feature creation' });
      
      // Clear error message after 5 seconds
      setTimeout(() => setFeatureMessage(null), 5000);
    } finally {
      setFeatureLoading(null);
    }
  };

  const handleUnfeatureCreation = async (creation: Creation) => {
    setFeatureLoading(creation.id);
    setFeatureMessage(null);
    
    // Give React a moment to render the loading state
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      console.log('[AdminDashboard] Unfeaturing creation:', creation.id);

      // Delete all page images from public-gallery
      const filesToDelete: string[] = [];
      
      // Collect all files to delete (up to 4 pages)
      for (let i = 0; i < 4; i++) {
        const fileName = `${creation.id}-page-${i}.webp`;
        filesToDelete.push(fileName);
      }

      if (filesToDelete.length > 0) {
        console.log('[AdminDashboard] Deleting page images:', filesToDelete);
        const { error: deleteError } = await supabase.storage
          .from('public-gallery')
          .remove(filesToDelete);
        
        if (deleteError) {
          console.warn('[AdminDashboard] Failed to delete some page images:', deleteError);
          // Continue anyway - not critical
        }
      }

      // Update the creation record
      const { error: updateError } = await supabase
        .from('creations')
        .update({
          is_featured: false,
          featured_thumbnail_url: null,
          featured_page_url: null,
          featured_pages: null,
        })
        .eq('id', creation.id);

      if (updateError) throw updateError;

      console.log('[AdminDashboard] Creation unfeatured successfully');
      
      // Refresh creations list before clearing loading state
      await fetchCreations();
      
      setFeatureMessage({ type: 'success', text: `"${creation.title}" has been removed from gallery` });

      // Clear success message after 3 seconds
      setTimeout(() => setFeatureMessage(null), 3000);
    } catch (err: any) {
      console.error('[AdminDashboard] Failed to unfeature creation:', err);
      setFeatureMessage({ type: 'error', text: err.message || 'Failed to unfeature creation' });
      
      // Clear error message after 5 seconds
      setTimeout(() => setFeatureMessage(null), 5000);
    } finally {
      setFeatureLoading(null);
    }
  };

  // Not logged in - show login form
  if (!effectiveIsAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-200">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔐</div>
            <h1 className="text-2xl font-black text-gunmetal mb-2">Admin Login</h1>
            <p className="text-blue-slate text-sm">Sign in to access the admin dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-2">
                Email
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-pacific-cyan focus:outline-none transition-colors font-medium text-gunmetal"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-pacific-cyan focus:outline-none transition-colors font-medium text-gunmetal pr-24"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-pacific-cyan hover:text-pacific-cyan/80 transition-colors px-2 py-1"
                >
                  {showPassword ? 'Hide' : 'Show me'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                {loginError}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loginLoading || !loginEmail || !loginPassword}
              isLoading={loginLoading}
              className="w-full"
              size="lg"
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={onBack}
              className="text-sm text-blue-slate hover:text-gunmetal transition-colors font-medium"
            >
              ← Back to App
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Logged in but not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-off-white flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border-4 border-red-200">
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-2xl font-black text-gunmetal mb-2">Access Denied</h1>
          <p className="text-blue-slate mb-2">You don't have permission to access this page.</p>
          <p className="text-xs text-silver mb-6">Logged in as: {userEmail}</p>
          <Button variant="ghost" onClick={onBack}>
            ← Back to App
          </Button>
        </div>
      </div>
    );
  }

  // Admin view
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gunmetal text-white px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-white/60 hover:text-white transition-colors">
              ← App
            </button>
            <div className="h-6 w-px bg-white/20" />
            <h1 className="text-xl font-black">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/60">{effectiveEmail}</span>
            <button
              onClick={onLogout}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-pacific-cyan text-white shadow-lg'
                : 'bg-white text-gunmetal hover:bg-slate-100'
            }`}
          >
            📦 Orders
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'preview'
                ? 'bg-pacific-cyan text-white shadow-lg'
                : 'bg-white text-gunmetal hover:bg-slate-100'
            }`}
          >
            🖨️ Print Preview
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'gallery'
                ? 'bg-pacific-cyan text-white shadow-lg'
                : 'bg-white text-gunmetal hover:bg-slate-100'
            }`}
          >
            ⭐ Gallery
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-pacific-cyan text-white shadow-lg'
                : 'bg-white text-gunmetal hover:bg-slate-100'
            }`}
          >
            ⚙️ Settings
          </button>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-gunmetal">Book Orders</h2>
              <button
                onClick={fetchOrders}
                className="text-sm text-pacific-cyan hover:text-pacific-cyan/80 font-bold"
              >
                Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-pacific-cyan/30 border-t-pacific-cyan rounded-full animate-spin mx-auto mb-4" />
                <p className="text-blue-slate">Loading orders...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-red-600 font-bold mb-2">Error loading orders</p>
                <p className="text-sm text-blue-slate">{error}</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-blue-slate">No orders yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider">
                        Date
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider">
                        Type
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4">
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
                            {truncateId(order.id)}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-sm text-gunmetal">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gunmetal">
                          {order.shipping_email || order.shipping_name || truncateId(order.user_id)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold uppercase ${
                              order.order_type === 'hardcover' ? 'text-purple-600' : 'text-blue-600'
                            }`}
                          >
                            {order.order_type === 'hardcover' ? '📖' : '📱'} {order.order_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              STATUS_COLORS[order.status]?.bg || 'bg-gray-100'
                            } ${STATUS_COLORS[order.status]?.text || 'text-gray-800'}`}
                          >
                            {order.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gunmetal">
                          {formatAmount(order.amount_paid)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Print Preview Tab */}
        {activeTab === 'preview' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-soft-gold/10 to-pacific-cyan/10">
              <h2 className="font-bold text-gunmetal flex items-center gap-2">
                <span className="text-2xl">🖨️</span>
                Print Preview & Test
              </h2>
              <p className="text-sm text-blue-slate mt-1">
                Generate print-ready PDFs for testing without submitting orders to Lulu
              </p>
            </div>

            {isLoading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-4 border-pacific-cyan/30 border-t-pacific-cyan rounded-full animate-spin mx-auto mb-4" />
                <p className="text-blue-slate">Loading creations...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-red-600 font-bold mb-2">Error loading creations</p>
                <p className="text-sm text-blue-slate">{error}</p>
              </div>
            ) : creations.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-4">📚</div>
                <p className="text-blue-slate">No creations found</p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {creations.map((creation) => {
                  const previewResult = previewResults.get(creation.id);
                  const isGenerating = previewLoading === creation.id;

                  return (
                    <div
                      key={creation.id}
                      className="border-2 border-slate-200 rounded-2xl p-5 hover:border-pacific-cyan/30 transition-all"
                    >
                      {/* Creation Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gunmetal text-lg mb-1 truncate">
                            {creation.title || 'Untitled Story'}
                          </h3>
                          <p className="text-sm text-blue-slate">
                            by {creation.artist_name || 'Unknown Artist'}
                          </p>
                          <p className="text-xs text-silver mt-1">
                            {formatDate(creation.created_at)}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 items-end">
                          {/* Book Type Selector */}
                          <select
                            value={selectedBookTypes.get(creation.id) || 'softcover'}
                            onChange={(e) => {
                              const newMap = new Map(selectedBookTypes);
                              newMap.set(creation.id, e.target.value);
                              setSelectedBookTypes(newMap);
                            }}
                            disabled={isGenerating}
                            className="px-3 py-2 rounded-lg border-2 border-slate-200 text-sm font-medium text-gunmetal bg-white hover:border-pacific-cyan/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="softcover">
                              📘 Softcover {bookPrices.softcover?.displayPrice ? `(${bookPrices.softcover.displayPrice})` : '(Loading...)'}
                            </option>
                            <option value="hardcover">
                              📕 Hardcover {bookPrices.hardcover?.displayPrice ? `(${bookPrices.hardcover.displayPrice})` : '(Loading...)'}
                            </option>
                          </select>

                          <button
                            onClick={() => generatePreview(creation.id)}
                            disabled={isGenerating}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                              isGenerating
                                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                : 'bg-soft-gold text-white hover:bg-soft-gold/90 shadow-md hover:shadow-lg active:scale-95'
                            }`}
                          >
                            {isGenerating ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <span>🖨️</span>
                                Generate Preview
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Preview Results */}
                      {previewResult && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          {previewResult.success && previewResult.pdfs ? (
                            <div className="space-y-4">
                              {/* Success Message */}
                              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xl">✅</span>
                                  <span className="font-bold text-green-700">PDFs Generated Successfully</span>
                                </div>
                                <p className="text-sm text-green-600 ml-7">
                                  Preview PDFs are ready for download and inspection
                                </p>
                              </div>

                              {/* Download Links */}
                              <div className="grid md:grid-cols-2 gap-4">
                                <a
                                  href={previewResult.pdfs.interior.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-4 bg-pacific-cyan/10 border-2 border-pacific-cyan/30 rounded-xl hover:bg-pacific-cyan/20 transition-all group"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-bold text-gunmetal mb-1">📄 Interior PDF</div>
                                      <div className="text-sm text-blue-slate">
                                        {previewResult.pdfs.interior.sizeMB} MB
                                      </div>
                                    </div>
                                    <div className="text-pacific-cyan group-hover:translate-x-1 transition-transform">
                                      ⬇
                                    </div>
                                  </div>
                                </a>

                                <a
                                  href={previewResult.pdfs.cover.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-4 bg-soft-gold/10 border-2 border-soft-gold/30 rounded-xl hover:bg-soft-gold/20 transition-all group"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-bold text-gunmetal mb-1">📕 Cover PDF</div>
                                      <div className="text-sm text-blue-slate">
                                        {previewResult.pdfs.cover.sizeMB} MB
                                      </div>
                                    </div>
                                    <div className="text-soft-gold group-hover:translate-x-1 transition-transform">
                                      ⬇
                                    </div>
                                  </div>
                                </a>
                              </div>

                              {/* Print Specs Summary */}
                              {previewResult.specs && (
                                <div className="bg-slate-50 rounded-xl p-4">
                                  <h4 className="font-bold text-gunmetal mb-3 flex items-center gap-2">
                                    <span>📐</span>
                                    Print Specifications
                                  </h4>
                                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                    <div>
                                      <span className="text-blue-slate font-bold">Format:</span>
                                      <p className="text-gunmetal">{previewResult.specs.format}</p>
                                    </div>
                                    <div>
                                      <span className="text-blue-slate font-bold">Binding:</span>
                                      <p className="text-gunmetal">{previewResult.specs.binding}</p>
                                    </div>
                                    <div>
                                      <span className="text-blue-slate font-bold">Pages:</span>
                                      <p className="text-gunmetal font-mono">{previewResult.specs.pageCount}</p>
                                    </div>
                                    <div>
                                      <span className="text-blue-slate font-bold">Spine Width:</span>
                                      <p className="text-gunmetal font-mono">{previewResult.specs.cover.spineWidth}</p>
                                    </div>
                                    <div>
                                      <span className="text-blue-slate font-bold">Interior Size:</span>
                                      <p className="text-gunmetal font-mono">{previewResult.specs.interior.dimensions}</p>
                                    </div>
                                    <div>
                                      <span className="text-blue-slate font-bold">Cover Size:</span>
                                      <p className="text-gunmetal font-mono">{previewResult.specs.cover.dimensions}</p>
                                    </div>
                                    <div>
                                      <span className="text-blue-slate font-bold">DPI:</span>
                                      <p className="text-gunmetal font-mono">{previewResult.specs.interior.dpi}</p>
                                    </div>
                                    <div>
                                      <span className="text-blue-slate font-bold">Bleed:</span>
                                      <p className="text-gunmetal font-mono">{previewResult.specs.interior.bleed}</p>
                                    </div>
                                  </div>

                                  {previewResult.expiresAt && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-silver">
                                      Download links expire: {formatDate(previewResult.expiresAt)}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Safety Note */}
                              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                                <div className="flex items-start gap-2">
                                  <span className="text-xl">ℹ️</span>
                                  <div className="text-sm">
                                    <p className="font-bold text-blue-700 mb-1">Preview Only</p>
                                    <p className="text-blue-600">
                                      These are test PDFs. No order has been submitted to Lulu. Download and inspect
                                      them before going live.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">❌</span>
                                <span className="font-bold text-red-700">Generation Failed</span>
                              </div>
                              <p className="text-sm text-red-600 ml-7">
                                {previewResult.error || 'Unknown error'}
                              </p>
                              {previewResult.details && (
                                <p className="text-xs text-red-500 ml-7 mt-2 font-mono">{previewResult.details}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Gallery Tab */}
        {activeTab === 'gallery' && (
          <div className="space-y-6">
            {/* Success/Error Message */}
            {featureMessage && (
              <div
                className={`rounded-xl p-4 border-2 ${
                  featureMessage.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{featureMessage.type === 'success' ? '✅' : '❌'}</span>
                  <span className="font-bold">{featureMessage.text}</span>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {isLoading ? (
                /* Loading State */
                <div className="p-12 text-center">
                  <div className="w-12 h-12 border-4 border-pacific-cyan/30 border-t-pacific-cyan rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-blue-slate font-medium">Loading creations...</p>
                </div>
              ) : error ? (
                /* Error State */
                <div className="p-12 text-center">
                  <div className="text-4xl mb-4">⚠️</div>
                  <p className="text-red-600 font-bold mb-2">Error loading creations</p>
                  <p className="text-sm text-blue-slate">{error}</p>
                </div>
              ) : creations.length === 0 ? (
                /* Empty State */
                <div className="p-12 text-center">
                  <div className="text-4xl mb-4">📚</div>
                  <p className="text-blue-slate">No creations found</p>
                </div>
              ) : (
                <>
              {/* Header with Featured Count */}
              <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-soft-gold/10 to-pacific-cyan/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="font-bold text-gunmetal flex items-center gap-2">
                      <span className="text-2xl">⭐</span>
                      Featured Gallery Management
                    </h2>
                    <p className="text-sm text-blue-slate mt-1">
                      Select creations to feature on the homepage gallery
                    </p>
                    {creations.length > 0 && (
                      <p className="text-xs text-silver mt-3">
                        Showing {creations.filter(c => c.thumbnail_url).length} creations with valid thumbnails
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-soft-gold">
                      {creations.filter(c => c.is_featured).length}
                    </div>
                    <div className="text-xs text-blue-slate uppercase tracking-wider">
                      Featured
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <input
                  type="text"
                  placeholder="Search by title or artist name..."
                  value={gallerySearch}
                  onChange={(e) => setGallerySearch(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-pacific-cyan focus:outline-none transition-colors font-medium text-gunmetal"
                />
              </div>

              <div className="overflow-x-auto">
                  {(() => {
                    // Filter and sort creations
                    let filteredCreations = creations.filter(creation => {
                      // Always exclude creations without valid thumbnails
                      if (!creation.thumbnail_url) return false;
                      
                      // Apply search filter if present
                      if (gallerySearch) {
                        const search = gallerySearch.toLowerCase();
                        const titleMatch = creation.title?.toLowerCase().includes(search);
                        const artistMatch = creation.artist_name?.toLowerCase().includes(search);
                        return titleMatch || artistMatch;
                      }
                      return true;
                    });

                    // Sort creations
                    filteredCreations.sort((a, b) => {
                      let aVal, bVal;
                      
                      switch (gallerySortBy) {
                        case 'title':
                          aVal = a.title || '';
                          bVal = b.title || '';
                          break;
                        case 'artist_name':
                          aVal = a.artist_name || '';
                          bVal = b.artist_name || '';
                          break;
                        case 'created_at':
                        default:
                          aVal = new Date(a.created_at).getTime();
                          bVal = new Date(b.created_at).getTime();
                      }
                      
                      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                      return gallerySortOrder === 'asc' ? comparison : -comparison;
                    });
                    
                    if (filteredCreations.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <div className="text-4xl mb-4">📭</div>
                          <p className="text-blue-slate">
                            {gallerySearch 
                              ? `No creations found matching "${gallerySearch}"`
                              : 'No creations with valid thumbnails found'}
                          </p>
                        </div>
                      );
                    }
                    
                    const handleSort = (column: typeof gallerySortBy) => {
                      if (gallerySortBy === column) {
                        setGallerySortOrder(gallerySortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setGallerySortBy(column);
                        setGallerySortOrder('asc');
                      }
                    };

                    const SortIcon = ({ column }: { column: typeof gallerySortBy }) => {
                      if (gallerySortBy !== column) return <span className="text-slate-300">↕</span>;
                      return gallerySortOrder === 'asc' ? <span>↑</span> : <span>↓</span>;
                    };
                    
                    return (
                      <>
                        {gallerySearch && (
                          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 text-sm text-blue-slate">
                            Showing {filteredCreations.length} of {creations.filter(c => c.thumbnail_url).length} creations
                          </div>
                        )}
                        {/* Table of Creations */}
                        <table className="w-full">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="text-left px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider">
                                Thumbnail
                              </th>
                              <th 
                                onClick={() => handleSort('title')}
                                className="text-left px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                              >
                                <div className="flex items-center gap-2">
                                  Title <SortIcon column="title" />
                                </div>
                              </th>
                              <th 
                                onClick={() => handleSort('artist_name')}
                                className="text-left px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                              >
                                <div className="flex items-center gap-2">
                                  Artist <SortIcon column="artist_name" />
                                </div>
                              </th>
                              <th className="text-left px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider">
                                Age
                              </th>
                              <th 
                                onClick={() => handleSort('created_at')}
                                className="text-left px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                              >
                                <div className="flex items-center gap-2">
                                  Created <SortIcon column="created_at" />
                                </div>
                              </th>
                              <th className="text-center px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider">
                                Featured
                              </th>
                              <th className="text-right px-6 py-3 text-xs font-bold text-blue-slate uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                          {filteredCreations.map((creation) => {
                            const isFeatured = creation.is_featured;
                            const isProcessing = featureLoading === creation.id;
                            const thumbnailUrl = creation.thumbnail_url;

                            return (
                              <tr
                                key={creation.id}
                                className={`hover:bg-slate-50 transition-colors ${
                                  isFeatured ? 'bg-soft-gold/5' : ''
                                }`}
                              >
                                {/* Thumbnail */}
                                <td className="px-6 py-4">
                                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-pacific-cyan/10 to-soft-gold/10 flex-shrink-0">
                                    {thumbnailUrl ? (
                                      <img
                                        src={thumbnailUrl}
                                        alt={creation.title || 'Untitled'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-xl">
                                        ⚠️
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* Title */}
                                <td className="px-6 py-4">
                                  <div className="font-bold text-gunmetal">
                                    {creation.title || 'Untitled Story'}
                                  </div>
                                </td>

                                {/* Artist */}
                                <td className="px-6 py-4 text-sm text-gunmetal">
                                  {creation.artist_name || 'Unknown Artist'}
                                </td>

                                {/* Age */}
                                <td className="px-6 py-4 text-sm text-gunmetal">
                                  {creation.age || '—'}
                                </td>

                                {/* Created Date */}
                                <td className="px-6 py-4 text-sm text-gunmetal">
                                  {formatDate(creation.created_at)}
                                </td>

                                {/* Featured Status */}
                                <td className="px-6 py-4 text-center">
                                  {isFeatured ? (
                                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-soft-gold/20 text-soft-gold text-xs font-bold">
                                      <span>⭐</span>
                                      Featured
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400">—</span>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={() => {
                                      console.log('[AdminDashboard] Feature button clicked!', { 
                                        creationId: creation.id, 
                                        isFeatured, 
                                        thumbnailUrl,
                                        hasPageImages: !!creation.page_images,
                                        pageImagesCount: creation.page_images?.length 
                                      });
                                      isFeatured
                                        ? handleUnfeatureCreation(creation)
                                        : handleFeatureCreation(creation);
                                    }}
                                    disabled={isProcessing || !thumbnailUrl}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                      isProcessing
                                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                        : !thumbnailUrl
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : isFeatured
                                        ? 'bg-slate-600 text-white hover:bg-slate-700'
                                        : 'bg-soft-gold text-white hover:bg-soft-gold/90'
                                    }`}
                                  >
                                    {isProcessing ? (
                                      <span className="flex items-center gap-2">
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing
                                      </span>
                                    ) : !thumbnailUrl ? (
                                      'No Image'
                                    ) : isFeatured ? (
                                      'Unfeature'
                                    ) : (
                                      'Feature'
                                    )}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          </tbody>
                        </table>
                      </>
                    );
                  })()}
              </div>
              </>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Lulu API Connection Test */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="font-bold text-gunmetal">Lulu Print API</h2>
                <p className="text-sm text-blue-slate mt-1">Test connection to the Lulu print-on-demand API</p>
              </div>

              <div className="p-6">
                {/* Test Button */}
                <Button
                  onClick={testLuluConnection}
                  disabled={luluTestLoading}
                  isLoading={luluTestLoading}
                  className="mb-6"
                >
                  {luluTestLoading ? 'Testing Connection...' : 'Test Lulu Connection'}
                </Button>

                {/* Test Results */}
                {luluTestResult && (
                  <div className="space-y-4">
                    {/* Environment Badge */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-blue-slate uppercase">Environment:</span>
                      {luluTestResult.environment ? (
                        <span
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                            luluTestResult.environment === 'production'
                              ? 'bg-red-100 text-red-700 border-2 border-red-300'
                              : 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                          }`}
                        >
                          {luluTestResult.environment === 'production' ? (
                            <>
                              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                              PRODUCTION
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 bg-amber-500 rounded-full" />
                              SANDBOX
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-silver">Unknown</span>
                      )}
                    </div>

                    {/* Status */}
                    <div
                      className={`p-4 rounded-xl ${
                        luluTestResult.success
                          ? 'bg-green-50 border-2 border-green-200'
                          : 'bg-red-50 border-2 border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{luluTestResult.success ? '✅' : '❌'}</span>
                        <span
                          className={`font-bold ${
                            luluTestResult.success ? 'text-green-700' : 'text-red-700'
                          }`}
                        >
                          {luluTestResult.success ? 'Connection Successful' : 'Connection Failed'}
                        </span>
                      </div>
                      {luluTestResult.message && (
                        <p className="text-sm text-green-600 ml-9">{luluTestResult.message}</p>
                      )}
                      {luluTestResult.error && (
                        <p className="text-sm text-red-600 ml-9">{luluTestResult.error}</p>
                      )}
                      {luluTestResult.details && !luluTestResult.success && (
                        <p className="text-xs text-red-500 ml-9 mt-1 font-mono">{luluTestResult.details}</p>
                      )}
                    </div>

                    {/* API Details */}
                    {luluTestResult.apiUrl && (
                      <div className="bg-slate-50 rounded-xl p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-blue-slate font-bold">API URL:</span>
                            <p className="font-mono text-gunmetal mt-1">{luluTestResult.apiUrl}</p>
                          </div>
                          {luluTestResult.totalPrintJobs !== undefined && (
                            <div>
                              <span className="text-blue-slate font-bold">Print Jobs:</span>
                              <p className="font-mono text-gunmetal mt-1">{luluTestResult.totalPrintJobs} found</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Preview Data */}
                    {luluTestResult.preview && luluTestResult.preview.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-blue-slate uppercase mb-2">Sample Data (first 5)</h4>
                        <div className="bg-slate-900 text-green-400 rounded-xl p-4 overflow-x-auto">
                          <pre className="text-xs font-mono">
                            {JSON.stringify(luluTestResult.preview, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* No test run yet */}
                {!luluTestResult && !luluTestLoading && (
                  <div className="text-center py-8 text-blue-slate">
                    <div className="text-4xl mb-3">🔌</div>
                    <p>Click the button above to test the Lulu API connection</p>
                  </div>
                )}
              </div>
            </div>

            {/* Lulu Webhooks Management */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="font-bold text-gunmetal">Lulu Webhooks</h2>
                <p className="text-sm text-blue-slate mt-1">
                  Manage webhooks to receive order status updates from Lulu
                </p>
              </div>

              <div className="p-6">
                {/* Message Display */}
                {webhookMessage && (
                  <div
                    className={`mb-6 p-4 rounded-xl border-2 ${
                      webhookMessage.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{webhookMessage.type === 'success' ? '✅' : '❌'}</span>
                      <span className="font-bold">{webhookMessage.text}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mb-6">
                  <Button
                    onClick={fetchWebhooks}
                    disabled={webhookLoading}
                    isLoading={webhookLoading}
                    variant="ghost"
                  >
                    {webhookLoading ? 'Loading...' : 'Refresh Webhooks'}
                  </Button>
                  <Button
                    onClick={registerWebhook}
                    disabled={webhookActionLoading === 'register'}
                    isLoading={webhookActionLoading === 'register'}
                  >
                    {webhookActionLoading === 'register' ? 'Registering...' : 'Register New Webhook'}
                  </Button>
                </div>

                {/* Webhook Data Display */}
                {webhookData && (
                  <div className="space-y-6">
                    {/* Environment Info */}
                    {webhookData.environment && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-blue-slate uppercase">Environment:</span>
                        <span
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                            webhookData.environment === 'production'
                              ? 'bg-red-100 text-red-700 border-2 border-red-300'
                              : 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                          }`}
                        >
                          {webhookData.environment === 'production' ? (
                            <>
                              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                              PRODUCTION
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 bg-amber-500 rounded-full" />
                              SANDBOX
                            </>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Registered Webhooks */}
                    <div>
                      <h3 className="text-sm font-bold text-blue-slate uppercase mb-3">Registered Webhooks</h3>
                      {webhookData.webhooks && webhookData.webhooks.length > 0 ? (
                        <div className="space-y-3">
                          {webhookData.webhooks.map((webhook) => (
                            <div
                              key={webhook.id}
                              className={`p-4 rounded-xl border-2 ${
                                webhook.is_active
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`w-2 h-2 rounded-full ${webhook.is_active ? 'bg-green-500' : 'bg-slate-400'}`} />
                                    <span className="font-bold text-gunmetal">Webhook #{webhook.id}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      webhook.is_active
                                        ? 'bg-green-200 text-green-700'
                                        : 'bg-slate-200 text-slate-600'
                                    }`}>
                                      {webhook.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  <p className="text-xs font-mono text-blue-slate break-all">{webhook.url}</p>
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {webhook.topics.map((topic) => (
                                      <span
                                        key={topic}
                                        className="text-xs px-2 py-0.5 bg-pacific-cyan/10 text-pacific-cyan rounded"
                                      >
                                        {topic}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => testWebhook(webhook.id)}
                                    disabled={webhookActionLoading === `test-${webhook.id}`}
                                    className="px-3 py-1.5 text-xs font-bold bg-pacific-cyan text-white rounded-lg hover:bg-pacific-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {webhookActionLoading === `test-${webhook.id}` ? '...' : 'Test'}
                                  </button>
                                  <button
                                    onClick={() => deleteWebhook(webhook.id)}
                                    disabled={webhookActionLoading === `delete-${webhook.id}`}
                                    className="px-3 py-1.5 text-xs font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {webhookActionLoading === `delete-${webhook.id}` ? '...' : 'Delete'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                          <div className="text-4xl mb-3">📭</div>
                          <p className="text-blue-slate mb-4">No webhooks registered yet</p>
                          <p className="text-xs text-silver">
                            Click "Register New Webhook" to create one
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Recent Submissions */}
                    {webhookData.recentSubmissions && webhookData.recentSubmissions.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-blue-slate uppercase mb-3">Recent Webhook Submissions</h3>
                        <div className="bg-slate-50 rounded-xl overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-100">
                              <tr>
                                <th className="text-left px-4 py-2 text-xs font-bold text-blue-slate">Time</th>
                                <th className="text-left px-4 py-2 text-xs font-bold text-blue-slate">Topic</th>
                                <th className="text-left px-4 py-2 text-xs font-bold text-blue-slate">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {webhookData.recentSubmissions.map((sub) => (
                                <tr key={sub.id}>
                                  <td className="px-4 py-2 text-xs text-gunmetal">
                                    {formatDate(sub.created_at)}
                                  </td>
                                  <td className="px-4 py-2 text-xs font-mono text-pacific-cyan">
                                    {sub.topic}
                                  </td>
                                  <td className="px-4 py-2">
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full ${
                                        sub.response_status_code === 200
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-red-100 text-red-700'
                                      }`}
                                    >
                                      {sub.response_status_code || 'Pending'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Error Display */}
                    {webhookData.error && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">❌</span>
                          <span className="font-bold text-red-700">Error</span>
                        </div>
                        <p className="text-sm text-red-600">{webhookData.error}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* No data yet */}
                {!webhookData && !webhookLoading && (
                  <div className="text-center py-8 text-blue-slate">
                    <div className="text-4xl mb-3">🔔</div>
                    <p>Click "Refresh Webhooks" to view registered webhooks</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Slide-over */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="h-full flex flex-col">
              {/* Detail Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-gunmetal">Order Details</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Detail Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status */}
                <div>
                  <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-2">
                    Status
                  </label>
                  <span
                    className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${
                      STATUS_COLORS[selectedOrder.status]?.bg || 'bg-gray-100'
                    } ${STATUS_COLORS[selectedOrder.status]?.text || 'text-gray-800'}`}
                  >
                    {selectedOrder.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-1">
                      Order ID
                    </label>
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono block break-all">
                      {selectedOrder.id}
                    </code>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-1">
                      Type
                    </label>
                    <p className="font-bold text-gunmetal capitalize">
                      {selectedOrder.order_type === 'hardcover' ? '📖 ' : '📱 '}
                      {selectedOrder.order_type}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-1">
                      Amount
                    </label>
                    <p className="font-bold text-gunmetal text-lg">
                      {formatAmount(selectedOrder.amount_paid)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-1">
                      Created
                    </label>
                    <p className="text-sm text-gunmetal">{formatDate(selectedOrder.created_at)}</p>
                  </div>
                </div>

                {/* Stripe Info */}
                {(selectedOrder.stripe_session_id || selectedOrder.stripe_payment_intent_id) && (
                  <div>
                    <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-2">
                      Stripe
                    </label>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      {selectedOrder.stripe_session_id && (
                        <div>
                          <span className="text-xs text-blue-slate">Session: </span>
                          <code className="text-xs font-mono">{truncateId(selectedOrder.stripe_session_id)}</code>
                        </div>
                      )}
                      {selectedOrder.stripe_payment_intent_id && (
                        <div>
                          <span className="text-xs text-blue-slate">Payment Intent: </span>
                          <code className="text-xs font-mono">{truncateId(selectedOrder.stripe_payment_intent_id)}</code>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dedication */}
                {selectedOrder.dedication_text && (
                  <div>
                    <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-2">
                      Dedication
                    </label>
                    <div className="bg-slate-50 rounded-xl p-4 italic text-gunmetal">
                      "{selectedOrder.dedication_text}"
                    </div>
                  </div>
                )}

                {/* Shipping (Hardcover only) */}
                {selectedOrder.order_type === 'hardcover' && selectedOrder.shipping_name && (
                  <div>
                    <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-2">
                      Shipping Address
                    </label>
                    <div className="bg-slate-50 rounded-xl p-4 text-sm text-gunmetal space-y-1">
                      <p className="font-bold">{selectedOrder.shipping_name}</p>
                      <p>{selectedOrder.shipping_address}</p>
                      <p>
                        {selectedOrder.shipping_city}, {selectedOrder.shipping_state}{' '}
                        {selectedOrder.shipping_zip}
                      </p>
                      <p>{selectedOrder.shipping_country}</p>
                      {selectedOrder.shipping_email && (
                        <p className="text-pacific-cyan">{selectedOrder.shipping_email}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Fulfillment */}
                {(selectedOrder.lulu_order_id || selectedOrder.tracking_number) && (
                  <div>
                    <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-2">
                      Fulfillment
                    </label>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      {selectedOrder.lulu_order_id && (
                        <div>
                          <span className="text-xs text-blue-slate">Lulu Order: </span>
                          <code className="text-xs font-mono">{selectedOrder.lulu_order_id}</code>
                        </div>
                      )}
                      {selectedOrder.tracking_number && (
                        <div>
                          <span className="text-xs text-blue-slate">Tracking: </span>
                          <code className="text-xs font-mono">{selectedOrder.tracking_number}</code>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* IDs */}
                <div>
                  <label className="text-xs font-bold text-blue-slate uppercase tracking-wider block mb-2">
                    References
                  </label>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
                    <div>
                      <span className="text-blue-slate">User ID: </span>
                      <code className="font-mono">{selectedOrder.user_id}</code>
                    </div>
                    <div>
                      <span className="text-blue-slate">Creation ID: </span>
                      <code className="font-mono">{selectedOrder.creation_id}</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
