
import React, { useState, useEffect } from 'react';
import { AppStep, AppState, DrawingAnalysis, ProductType, ShippingInfo, OrderStatus, Order, User } from './types';
import { analyzeDrawing, generateAnimation, generateStoryImage } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { 
  uploadFile, 
  saveDrawing, 
  updateDrawingVideo, 
  createOrder, 
  getProfile 
} from './services/supabaseService';
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

  const handleStart = async () => {
    try {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
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
    setCurrentDrawingId(undefined);
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
                onOpenStory={() => setShowStorybook(true)}
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
                heroImage={state.heroImageUrl!}
                onUpdate={handleUpdateAnalysis}
                onConfirm={() => {
                  handleOrderComplete(selectedProduct!, state.analysis!.dedication || "");
                }}
                onBack={() => setState(prev => ({...prev, step: AppStep.PRODUCT_SELECT}))}
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
          onClose={() => setShowStorybook(false)}
          onOrder={() => {
            setShowStorybook(false);
            setState(p => ({...p, step: AppStep.PRODUCT_SELECT}));
          }}
        />
      )}

      {activeInfoPage && (
        <InfoPages type={activeInfoPage} onClose={() => setActiveInfoPage(null)} />
      )}
    </div>
  );
};

export default App;
