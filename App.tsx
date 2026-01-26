
import React, { useState, useEffect } from 'react';
import { AppStep, AppState, DrawingAnalysis, ProductType, ShippingInfo, OrderStatus, Order, User } from './types';
import { analyzeDrawing, generateAnimation, generateStoryImage } from './services/geminiService';
import { saveDraft, restoreDraft, clearDraft, hasDraft } from './services/draftStorage';
import { supabase } from './services/supabaseClient';
import {
  uploadFile,
  saveDrawing,
  updateDrawingVideo,
  createOrder,
  getProfile
} from './services/supabaseService';
import { canSaveCreation, saveCreation, CreationWithSignedUrls } from './services/creationsService';
import { getCreditBalance, canCreate, useCredit, CreditBalance } from './services/creditsService';
import { createCheckout } from './services/stripeService';
import { useVisibilityRefresh, isAbortError } from './hooks/useVisibilityRefresh';
import Header from './components/Header';
import Footer from './components/Footer';
import StepInitial from './components/StepInitial';
import AuthScreen from './components/AuthScreen';
import StepAuthSuccess from './components/StepAuthSuccess';
import ProfilePage from './components/ProfilePage';
import StepUpload from './components/StepUpload';
import StepRefining from './components/StepRefining';
import StepProcessing from './components/StepProcessing';
import StepResult from './components/StepResult';
import Storybook from './components/Storybook';
import SaveCreationModal from './components/SaveCreationModal';
import MyCreations from './components/MyCreations';
import ProductSelection from './components/ProductSelection';
import OrderFlow from './components/OrderFlow';
import BookProof from './components/BookProof';
import Confirmation from './components/Confirmation';
import InfoPages, { InfoPageType } from './components/InfoPages';
import PricingModal from './components/PricingModal';
import CreditPurchaseSuccess from './components/CreditPurchaseSuccess';
import BookOrderSuccess from './components/BookOrderSuccess';
import AdminDashboard from './components/AdminDashboard';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    step: AppStep.INITIAL,
    user: null,
    originalImage: null,
    analysis: null,
    finalVideoUrl: null,
    error: null
  });

  const [loadingText, setLoadingText] = useState('Thinking...');
  const [showStorybook, setShowStorybook] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [activeInfoPage, setActiveInfoPage] = useState<InfoPageType | null>(null);
  const [authInitialIsLogin, setAuthInitialIsLogin] = useState(false);
  const [prevStep, setPrevStep] = useState<AppStep>(AppStep.INITIAL);
  const [currentDrawingId, setCurrentDrawingId] = useState<string | undefined>(undefined);

  // Save creation modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ savesUsed: number; limit: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [creationSaved, setCreationSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentCreationId, setCurrentCreationId] = useState<string | null>(null);

  // My Creations gallery state
  const [showMyCreations, setShowMyCreations] = useState(false);
  const [viewingCreation, setViewingCreation] = useState<CreationWithSignedUrls | null>(null);

  // Credit system state
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null);
  const [showOutOfCredits, setShowOutOfCredits] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
  const [showBookOrderSuccess, setShowBookOrderSuccess] = useState(false);
  const [bookOrderSessionId, setBookOrderSessionId] = useState<string | null>(null);

  // Admin dashboard state
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // Visibility refresh hook for handling stale connections
  const { refreshKey, getSignal } = useVisibilityRefresh();

  const buildUser = (sessionUser: any, profile: any): User | null => {
    if (!sessionUser && !profile) return null;
    const meta = sessionUser?.user_metadata || {};
    return {
      id: profile?.id || sessionUser?.id || '',
      firstName: profile?.first_name || meta.first_name || '',
      lastName: profile?.last_name || meta.last_name || '',
      email: profile?.email || sessionUser?.email || '',
      subscribed: profile?.subscribed || profile?.subscription_tier === 'premium' || false,
      createdAt: profile?.created_at || sessionUser?.created_at || new Date().toISOString(),
    };
  };

  // Supabase Auth Listener with visibility refresh support
  useEffect(() => {
    const signal = getSignal();

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[Root] initAuth session:', session);
        if (session?.user) {
          let profile = null;
          try {
            profile = await getProfile(session.user.id, signal);
          } catch (e) {
            console.error('[Root] initAuth profile fetch failed:', e);
          }
          const user = buildUser(session.user, profile);
          setState(prev => ({
            ...prev,
            user,
          }));
          // Fetch credit balance on login
          try {
            const balance = await getCreditBalance(session.user.id, signal);
            setCreditBalance(balance);
          } catch (err) {
            if (!isAbortError(err)) {
              console.error('Failed to fetch credit balance:', err);
            }
          }
        }
      } catch (err) {
        if (!isAbortError(err)) {
          console.error('Failed to init auth:', err);
        }
      }
    };

    initAuth();

    // Auth state changes should NOT use the signal - they need to always work
    // regardless of tab visibility state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[Root] onAuthStateChange session:', session);
      if (session?.user) {
        try {
          let profile = null;
          try {
            profile = await getProfile(session.user.id);
          } catch (e) {
            console.error('[Root] onAuthStateChange profile fetch failed:', e);
          }
          const user = buildUser(session.user, profile);
          setState(prev => ({
            ...prev,
            user,
          }));
          // Fetch credit balance on auth state change
          const balance = await getCreditBalance(session.user.id);
          setCreditBalance(balance);
        } catch (err) {
          console.error('Failed to fetch profile/credits:', err);
        }
      } else {
        setState(prev => ({ ...prev, user: null }));
        setCreditBalance(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshKey, getSignal]);

  // Restore draft on app load
  useEffect(() => {
    const checkAndRestoreDraft = async () => {
      try {
        const draft = await restoreDraft();
        if (draft) {
          setState(prev => ({
            ...prev,
            originalImage: draft.originalImage,
            analysis: draft.analysis as DrawingAnalysis,
            finalVideoUrl: draft.videoUrl,
            step: AppStep.RESULT
          }));
        }
      } catch (err) {
        console.error('Failed to restore draft:', err);
      }
    };

    checkAndRestoreDraft();
  }, []);

  // Check for successful Stripe purchase return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const path = window.location.pathname;

    if (sessionId) {
      // Check if this is a book order success or credit purchase success
      if (path === '/order-success' || path === '/order-success/') {
        setShowBookOrderSuccess(true);
        setBookOrderSessionId(sessionId);
      } else {
        // Default to credit purchase success
        setShowPurchaseSuccess(true);
      }
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Check for admin route
  useEffect(() => {
    const checkAdminRoute = () => {
      const isAdminPath = window.location.pathname === '/admin' || window.location.pathname === '/admin/';
      setShowAdminDashboard(isAdminPath);
    };

    checkAdminRoute();

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', checkAdminRoute);
    return () => window.removeEventListener('popstate', checkAdminRoute);
  }, []);

  const refreshCreditBalance = async () => {
    if (state.user) {
      const balance = await getCreditBalance(state.user.id);
      setCreditBalance(balance);
    }
  };

  const handleOpenStory = async () => {
    if (!state.user) {
      // Save draft before redirecting to auth
      if (state.originalImage && state.analysis && state.finalVideoUrl) {
        try {
          await saveDraft(state.originalImage, state.analysis, state.finalVideoUrl);
        } catch (err) {
          console.error('Failed to save draft:', err);
        }
      }
      setAuthInitialIsLogin(false);
      setState(prev => ({ ...prev, step: AppStep.AUTH }));
      return;
    }

    // User is authenticated - fetch save status and show storybook
    try {
      const status = await canSaveCreation(state.user.id);
      setSaveStatus({ savesUsed: status.savesUsed, limit: status.limit });
    } catch (err) {
      console.error('Failed to fetch save status:', err);
      // Default to free tier defaults
      setSaveStatus({ savesUsed: 0, limit: 3 });
    }

    setShowStorybook(true);
    try {
      await clearDraft();
    } catch (err) {
      console.error('Failed to clear draft:', err);
    }
  };

  const handleStart = async () => {
    try {
      // Only check for AI Studio key if running in AI Studio environment
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
        }
      }

      // If user is not logged in, redirect to auth first
      if (!state.user) {
        setAuthInitialIsLogin(false);
        setState(prev => ({ ...prev, step: AppStep.AUTH }));
        return;
      }

      // Check if user can create (has credits available)
      const createResult = await canCreate(state.user.id);
      if (!createResult.canCreate && createResult.reason === 'no_credits') {
        setShowOutOfCredits(true);
        return;
      }

      setState(prev => ({ ...prev, step: AppStep.UPLOAD }));
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Magic key needed!' }));
    }
  };

  const handleLoginClick = () => {
    setAuthInitialIsLogin(true);
    setState(prev => ({ ...prev, step: AppStep.AUTH }));
  };

  const handleProfileClick = () => {
    setPrevStep(state.step);
    setState(prev => ({ ...prev, step: AppStep.PROFILE }));
  };

  const handleUpdateProfile = (updatedUser: User) => {
    setState(prev => ({ ...prev, user: updatedUser }));
  };

  const handleAuthenticated = (user: User, isNewUser: boolean) => {
    setState(prev => {
      if (isNewUser) {
        return { ...prev, user, step: AppStep.AUTH_SUCCESS };
      }
      const nextStep = prev.finalVideoUrl ? AppStep.RESULT : AppStep.UPLOAD;
      return { ...prev, user, step: nextStep };
    });
  };

  const handleAuthSuccessContinue = () => {
    setState(prev => ({
      ...prev,
      step: prev.finalVideoUrl ? AppStep.RESULT : AppStep.UPLOAD
    }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setState(prev => ({ ...prev, user: null, step: AppStep.INITIAL }));
  };

  const handleImageSelected = async (base64: string) => {
    setState(prev => ({ ...prev, step: AppStep.ANALYZING, originalImage: base64 }));
    setLoadingText('Reading your magic art...');
    
    try {
      const result = await analyzeDrawing(base64);
      setState(prev => ({ ...prev, step: AppStep.REFINING, analysis: result }));
    } catch (err: any) {
      setState(prev => ({ ...prev, step: AppStep.UPLOAD, error: 'Magic failed! Try a clearer photo.' }));
    }
  };

  const handleStartAnimation = async (refinedAnalysis: DrawingAnalysis) => {
    if (!state.originalImage) return;
    setState(prev => ({ ...prev, step: AppStep.ANIMATING, analysis: refinedAnalysis }));
    setLoadingText('Waking up the magic...');
    
    try {
      // 1. Upload original to storage if user is logged in
      let persistentImageUrl = state.originalImage;
      if (state.user) {
        const path = `${state.user.id}/${Date.now()}_original.png`;
        persistentImageUrl = await uploadFile('drawings', path, state.originalImage);
        // 2. Initial DB Save
        const drawing = await saveDrawing(state.user.id, persistentImageUrl, refinedAnalysis);
        setCurrentDrawingId(drawing.id);
      }

      const { videoUrl, heroImageUrl } = await generateAnimation(
        state.originalImage, 
        refinedAnalysis
      );
      
      setState(prev => ({ 
        ...prev, 
        finalVideoUrl: videoUrl,
        heroImageUrl: heroImageUrl 
      }));

      // Background: Generate story images
      refinedAnalysis.pages.forEach(async (page, i) => {
        try {
          const img = await generateStoryImage(
            state.originalImage!, 
            refinedAnalysis.characterAppearance, 
            page.imagePrompt
          );
          setState(prev => {
            if (!prev.analysis) return prev;
            const newPages = [...prev.analysis.pages];
            newPages[i] = { ...newPages[i], imageUrl: img };
            return { ...prev, analysis: { ...prev.analysis, pages: newPages } };
          });
        } catch (e) { console.error("Page gen failed", i); }
      });

      if (state.user) {
        setState(prev => ({ ...prev, step: AppStep.RESULT }));
      } else {
        setAuthInitialIsLogin(false);
        setState(prev => ({ ...prev, step: AppStep.AUTH }));
      }
      
    } catch (err: any) {
      console.error(err);
      setState(prev => ({ ...prev, step: AppStep.REFINING, error: 'Magic broke! Try again.' }));
    }
  };

  const handleUpdateAnalysis = (updates: Partial<DrawingAnalysis>) => {
    setState(prev => ({
      ...prev,
      analysis: prev.analysis ? { ...prev.analysis, ...updates } : null
    }));
  };

  const handleOrderComplete = async (product: ProductType, dedication: string, shipping?: ShippingInfo) => {
    if (!state.user) return;
    
    try {
      const amount = product === ProductType.HARDCOVER ? 4798 : 1299;
      const orderData = await createOrder(
        state.user.id, 
        currentDrawingId, 
        product, 
        amount, 
        shipping || null
      );

      const mockOrder: Order = {
        id: orderData.id,
        createdAt: orderData.created_at,
        customerEmail: shipping?.email || state.user?.email || "artist@example.com",
        productType: product,
        totalAmount: amount,
        status: OrderStatus.PAYMENT_RECEIVED
      };
      
      setState(prev => ({
        ...prev,
        step: AppStep.CONFIRMATION,
        currentOrder: mockOrder
      }));
    } catch (err) {
      alert("Checkout failed. Magic encountered a wall!");
    }
  };

  const handleReset = () => {
    setState(prev => ({
      ...prev,
      step: AppStep.INITIAL,
      originalImage: null,
      analysis: null,
      finalVideoUrl: null,
      error: null
    }));
    setShowStorybook(false);
    setShowSaveModal(false);
    setCreationSaved(false);
    setSaveStatus(null);
    setCurrentDrawingId(undefined);
    setCurrentCreationId(null);
    setViewingCreation(null);
    setShowMyCreations(false);
    setShowOutOfCredits(false);
    setShowPricingModal(false);
  };

  const handleStorybookClose = async () => {
    setShowStorybook(false);

    // If viewing a saved creation, skip save modal and just reset
    if (viewingCreation) {
      handleReset();
      return;
    }

    // If user is not authenticated, skip save modal and reset
    if (!state.user) {
      handleReset();
      return;
    }

    // Fetch save status and show modal for NEW unsaved creations
    try {
      const status = await canSaveCreation(state.user.id);
      setSaveStatus({ savesUsed: status.savesUsed, limit: status.limit });
      setShowSaveModal(true);
    } catch (err) {
      console.error('Failed to check save status:', err);
      // Default to showing modal with free tier defaults
      setSaveStatus({ savesUsed: 0, limit: 3 });
      setShowSaveModal(true);
    }
  };

  const handleSaveCreation = async () => {
    if (!state.user || !state.originalImage || !state.finalVideoUrl || !state.analysis) {
      return;
    }

    // Immediately open pricing modal and start saving in background
    setIsSaving(true);
    setSaveMessage(null);
    setShowPricingModal(true);

    // Run save in background (don't block UI)
    const doSave = async () => {
      try {
        // Gather page images from analysis
        const pageImages = state.analysis!.pages
          .map(page => page.imageUrl)
          .filter((url): url is string => !!url);

        const result = await saveCreation(state.user!.id, {
          originalImage: state.originalImage!,
          videoUrl: state.finalVideoUrl!,
          analysis: state.analysis!,
          pageImages,
        });

        if (result.success && result.creationId) {
          // Store the creation ID for order flow
          setCurrentCreationId(result.creationId);

          // Deduct credit after successful creation save
          try {
            const creditResult = await useCredit(state.user!.id, result.creationId);
            setCreditBalance(creditResult.newBalance);
          } catch (creditErr) {
            console.error('Failed to deduct credit:', creditErr);
            // Don't fail the save if credit deduction fails
          }

          setShowSaveModal(false);
          setCreationSaved(true);
          // Update save count (only for free tier users)
          setSaveStatus(prev => {
            if (prev && prev.limit !== Infinity) {
              return { ...prev, savesUsed: prev.savesUsed + 1 };
            }
            return prev;
          });
        } else {
          setSaveMessage({ type: 'error', text: result.error || 'Failed to save creation' });
        }
      } catch (err) {
        console.error('Error saving creation:', err);
        setSaveMessage({ type: 'error', text: 'An unexpected error occurred' });
      } finally {
        setIsSaving(false);
      }
    };

    // Start save without awaiting (background)
    doSave();
  };

  const handleDiscardCreation = () => {
    setShowSaveModal(false);
    setSaveMessage({ type: 'success', text: 'Creation discarded' });
    // Auto-clear message and reset after a brief delay
    setTimeout(() => {
      setSaveMessage(null);
      handleReset();
    }, 1500);
  };

  const handleSelectPack = async (packName: 'starter' | 'popular' | 'best_value') => {
    // If user is not logged in, redirect to auth first
    if (!state.user) {
      setShowPricingModal(false);
      setAuthInitialIsLogin(false);
      setState(prev => ({ ...prev, step: AppStep.AUTH }));
      return;
    }

    try {
      setIsPurchasing(true);
      const checkoutUrl = await createCheckout(packName);
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      // Show error to user
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleOpenSavedCreation = (creation: CreationWithSignedUrls) => {
    // Store the creation being viewed
    setViewingCreation(creation);

    // Reconstruct analysis with signed page image URLs
    const analysisWithImages: DrawingAnalysis = {
      ...creation.analysis_json,
      pages: creation.analysis_json.pages.map((page, index) => ({
        ...page,
        imageUrl: creation.page_image_urls[index] || page.imageUrl,
      })),
    };

    // Update app state to view the saved creation
    setState(prev => ({
      ...prev,
      originalImage: creation.original_image_url,
      finalVideoUrl: creation.video_url,
      heroImageUrl: creation.original_image_url,
      analysis: analysisWithImages,
      step: AppStep.RESULT,
    }));

    // Close the gallery
    setShowMyCreations(false);
  };

  const isImmersiveStep = state.step === AppStep.RESULT || state.step === AppStep.ANIMATING || showStorybook;

  const handleExitAdmin = () => {
    setShowAdminDashboard(false);
    window.history.pushState({}, '', '/');
  };

  const handleAdminLogin = () => {
    setShowAdminDashboard(false);
    window.history.pushState({}, '', '/');
    setAuthInitialIsLogin(true);
    setState(prev => ({ ...prev, step: AppStep.AUTH }));
  };

  // Render Admin Dashboard if on /admin route
  if (showAdminDashboard) {
    return (
      <AdminDashboard
        userEmail={state.user?.email || null}
        isAuthenticated={!!state.user}
        onLogin={handleAdminLogin}
        onBack={handleExitAdmin}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-off-white text-gunmetal relative flex flex-col ${showStorybook ? 'overflow-hidden' : ''}`}>
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pacific-cyan/30 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-soft-gold/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
      </div>

      {!showStorybook && (
        <>
          <Header
            onLogoClick={handleReset}
            user={state.user}
            onLogout={handleLogout}
            onLoginClick={handleLoginClick}
            onProfileClick={handleProfileClick}
            onMyCreations={state.user ? () => setShowMyCreations(true) : undefined}
            creditBalance={creditBalance}
            onGetCredits={() => setShowPricingModal(true)}
          />
          <main className="relative z-10 flex-grow">
            {state.error && (
              <div className="max-w-4xl mx-auto px-4 mt-6">
                <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center justify-between shadow-sm">
                  <span>{state.error}</span>
                  <button onClick={() => setState(p => ({...p, error: null}))} className="text-red-800 font-bold px-2">✕</button>
                </div>
              </div>
            )}

            {state.step === AppStep.INITIAL && <StepInitial onStart={handleStart} onLogin={handleLoginClick} />}
            {state.step === AppStep.AUTH && (
              <AuthScreen 
                onAuthenticated={handleAuthenticated} 
                hasResult={!!state.finalVideoUrl} 
                initialIsLogin={authInitialIsLogin}
              />
            )}
            {state.step === AppStep.AUTH_SUCCESS && state.user && (
              <StepAuthSuccess firstName={state.user.firstName} onContinue={handleAuthSuccessContinue} />
            )}
            {state.step === AppStep.PROFILE && state.user && (
              <ProfilePage 
                user={state.user} 
                onUpdate={handleUpdateProfile} 
                onBack={() => setState(prev => ({...prev, step: prevStep}))}
                onLogout={handleLogout}
              />
            )}
            {state.step === AppStep.UPLOAD && <StepUpload onImageSelected={handleImageSelected} />}
            {(state.step === AppStep.ANALYZING || state.step === AppStep.ANIMATING) && (
              <StepProcessing text={loadingText} originalImage={state.originalImage} isAnimating={state.step === AppStep.ANIMATING} />
            )}
            {state.step === AppStep.REFINING && state.analysis && (
              <div className="max-w-4xl mx-auto px-4"><StepRefining analysis={state.analysis} onConfirm={handleStartAnimation} originalImage={state.originalImage} /></div>
            )}
            {state.step === AppStep.RESULT && state.finalVideoUrl && (
              <StepResult 
                videoUrl={state.finalVideoUrl} 
                onReset={handleReset} 
                analysis={state.analysis}
                onOpenStory={handleOpenStory}
                onOrder={() => setState(p => ({...p, step: AppStep.PRODUCT_SELECT}))}
                isStoryLoading={!state.analysis?.pages.every(p => p.imageUrl)}
              />
            )}
            {state.step === AppStep.PRODUCT_SELECT && (
              <ProductSelection 
                onSelect={(p) => {
                  setSelectedProduct(p);
                  setState(prev => ({...prev, step: AppStep.CHECKOUT}));
                }} 
                onBack={() => setState(prev => ({...prev, step: AppStep.RESULT}))}
              />
            )}
            {state.step === AppStep.CHECKOUT && state.analysis && (
              <BookProof
                analysis={state.analysis}
                originalImage={state.originalImage!}
                heroImage={state.heroImageUrl || state.originalImage!}
                onUpdate={handleUpdateAnalysis}
                onApprove={() => {
                  setState(prev => ({...prev, step: AppStep.ORDER_FLOW}));
                }}
                onBack={() => setState(prev => ({...prev, step: AppStep.PRODUCT_SELECT}))}
              />
            )}
            {state.step === AppStep.ORDER_FLOW && state.analysis && state.user && (currentCreationId || viewingCreation?.id) && (
              <OrderFlow
                analysis={state.analysis}
                userId={state.user.id}
                creationId={(viewingCreation?.id || currentCreationId)!}
                userEmail={state.user.email}
                onClose={() => setState(prev => ({...prev, step: AppStep.CHECKOUT}))}
                onComplete={(product, dedication, shipping) => {
                  handleOrderComplete(product, dedication, shipping);
                }}
              />
            )}
            {state.step === AppStep.CONFIRMATION && state.currentOrder && (
              <Confirmation order={state.currentOrder} onNew={handleReset} />
            )}
          </main>
          
          {!isImmersiveStep && <Footer onNavigate={setActiveInfoPage} />}
        </>
      )}

      {showStorybook && state.analysis && state.finalVideoUrl && (
        <Storybook
          analysis={state.analysis}
          videoUrl={state.finalVideoUrl}
          onClose={handleStorybookClose}
          onOrder={() => {
            setShowStorybook(false);
            setState(p => ({...p, step: AppStep.PRODUCT_SELECT}));
          }}
          onSave={handleSaveCreation}
          savesUsed={saveStatus?.savesUsed ?? 0}
          limit={saveStatus?.limit ?? 3}
          isSaving={isSaving}
          isAlreadySaved={!!viewingCreation || creationSaved}
          onGetCredits={() => setShowPricingModal(true)}
        />
      )}

      <SaveCreationModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveCreation}
        onDiscard={handleDiscardCreation}
        savesUsed={saveStatus?.savesUsed ?? 0}
        limit={saveStatus?.limit ?? 3}
        isLoading={isSaving}
      />

      {/* Toast message for save/discard feedback */}
      {saveMessage && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] px-6 py-3 rounded-2xl font-bold text-sm shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          saveMessage.type === 'success'
            ? 'bg-pacific-cyan text-white'
            : 'bg-red-500 text-white'
        }`}>
          {saveMessage.text}
        </div>
      )}

      {activeInfoPage && (
        <InfoPages type={activeInfoPage} onClose={() => setActiveInfoPage(null)} />
      )}

      {/* My Creations Gallery */}
      {showMyCreations && state.user && (
        <div className="fixed inset-0 z-50 bg-off-white animate-in fade-in duration-300">
          <MyCreations
            userId={state.user.id}
            onBack={() => setShowMyCreations(false)}
            onOpenCreation={handleOpenSavedCreation}
            onStartCreation={() => {
              setShowMyCreations(false);
              setState(prev => ({ ...prev, step: AppStep.UPLOAD }));
            }}
            onGetCredits={() => setShowPricingModal(true)}
          />
        </div>
      )}

      {/* Out of Credits Modal */}
      {showOutOfCredits && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-2xl max-w-md text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="text-5xl mb-4">✨</div>
            <h2 className="text-2xl font-bold text-gunmetal mb-2">You've used your free creations!</h2>
            <p className="text-gunmetal/70 mb-6">Get more credits to continue making magic.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowOutOfCredits(false)}
                className="px-5 py-2.5 border-2 border-gunmetal/20 text-gunmetal rounded-xl font-semibold hover:bg-gunmetal/5 transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={() => {
                  setShowOutOfCredits(false);
                  setShowPricingModal(true);
                }}
                className="px-5 py-2.5 bg-pacific-cyan text-white rounded-xl font-semibold hover:bg-pacific-cyan/90 transition-colors shadow-md"
              >
                View Pricing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        currentBalance={creditBalance}
        onSelectPack={handleSelectPack}
        isLoading={isPurchasing}
        isAuthenticated={!!state.user}
        isSaving={isSaving}
        savesUsed={saveStatus?.savesUsed ?? 0}
        saveLimit={saveStatus?.limit ?? 3}
        saveComplete={creationSaved}
      />

      {/* Credit Purchase Success */}
      {showPurchaseSuccess && (
        <div className="fixed inset-0 z-50 bg-off-white flex items-center justify-center">
          <CreditPurchaseSuccess
            onContinue={() => {
              setShowPurchaseSuccess(false);
              setState(prev => ({ ...prev, step: AppStep.UPLOAD }));
            }}
            onRefreshBalance={refreshCreditBalance}
            creditBalance={creditBalance}
          />
        </div>
      )}

      {/* Book Order Success */}
      {showBookOrderSuccess && bookOrderSessionId && (
        <BookOrderSuccess
          sessionId={bookOrderSessionId}
          onContinue={() => {
            setShowBookOrderSuccess(false);
            setBookOrderSessionId(null);
            setState(prev => ({ ...prev, step: AppStep.UPLOAD }));
          }}
        />
      )}
    </div>
  );
};

export default App;
