
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
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // My Creations gallery state
  const [showMyCreations, setShowMyCreations] = useState(false);
  const [viewingCreation, setViewingCreation] = useState<CreationWithSignedUrls | null>(null);

  // Supabase Auth Listener
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        setState(prev => ({ 
          ...prev, 
          user: profile ? {
            id: profile.id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            email: profile.email,
            subscribed: profile.subscribed,
            createdAt: profile.created_at
          } : null 
        }));
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        setState(prev => ({ 
          ...prev, 
          user: profile ? {
            id: profile.id,
            firstName: profile.first_name,
            lastName: profile.last_name,
            email: profile.email,
            subscribed: profile.subscribed,
            createdAt: profile.created_at
          } : null 
        }));
      } else {
        setState(prev => ({ ...prev, user: null }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
      setSaveStatus({ savesUsed: 0, limit: 5 });
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
    setSaveStatus(null);
    setCurrentDrawingId(undefined);
    setViewingCreation(null);
    setShowMyCreations(false);
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
      setSaveStatus({ savesUsed: 0, limit: 5 });
      setShowSaveModal(true);
    }
  };

  const handleSaveCreation = async () => {
    if (!state.user || !state.originalImage || !state.finalVideoUrl || !state.analysis) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Gather page images from analysis
      const pageImages = state.analysis.pages
        .map(page => page.imageUrl)
        .filter((url): url is string => !!url);

      const result = await saveCreation(state.user.id, {
        originalImage: state.originalImage,
        videoUrl: state.finalVideoUrl,
        analysis: state.analysis,
        pageImages,
      });

      if (result.success) {
        setShowSaveModal(false);
        setSaveMessage({ type: 'success', text: 'Creation saved to your gallery!' });
        // Auto-clear success message and reset after a brief delay
        setTimeout(() => {
          setSaveMessage(null);
          handleReset();
        }, 2000);
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

  const handleDiscardCreation = () => {
    setShowSaveModal(false);
    setSaveMessage({ type: 'success', text: 'Creation discarded' });
    // Auto-clear message and reset after a brief delay
    setTimeout(() => {
      setSaveMessage(null);
      handleReset();
    }, 1500);
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

            {state.step === AppStep.INITIAL && <StepInitial onStart={handleStart} />}
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
            {state.step === AppStep.ORDER_FLOW && state.analysis && (
              <OrderFlow
                analysis={state.analysis}
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
          limit={saveStatus?.limit ?? 5}
          isSaving={isSaving}
          isAlreadySaved={!!viewingCreation}
        />
      )}

      <SaveCreationModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveCreation}
        onDiscard={handleDiscardCreation}
        savesUsed={saveStatus?.savesUsed ?? 0}
        limit={saveStatus?.limit ?? 5}
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
          />
        </div>
      )}
    </div>
  );
};

export default App;
