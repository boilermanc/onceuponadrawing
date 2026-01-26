import React, { useEffect, useCallback, useState } from 'react';
import { supabase, getSupabaseAnonKey, getSupabaseUrl as getSupabaseUrlFromClient } from '../services/supabaseClient';

type BookType = 'hardcover' | 'softcover';
type OrderStep = 'SELECT_TYPE' | 'DETAILS' | 'SHIPPING' | 'LOADING_RATES' | 'SELECT_SHIPPING';

interface ShippingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  stateCode: string;
  postalCode: string;
  countryCode: string;
  phoneNumber?: string;
  email?: string;
}

interface BillingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  stateCode: string;
  postalCode: string;
  countryCode: string;
}

interface ShippingOption {
  shippingOptionId: string;
  shippingOptionName: string;
  productCost: number;
  shippingCost: number;
  totalCost: number;
  currency: string;
  deliveryDays: string;
}

const US_STATES = [
  { code: '', name: 'Select State' },
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'Washington DC' },
];

interface BookPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  creation: {
    id: string;
    title: string;
    artistName: string;
    thumbnailUrl?: string;
  } | null;
  onPurchase?: (creationId: string) => void;
  userId?: string;
  userEmail?: string;
  isGift?: boolean;
}

// Book Type Selection Modal (appears first)
const BookTypeSelectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: BookType) => void;
  creation: BookPurchaseModalProps['creation'];
}> = ({ isOpen, onClose, onSelectType, creation }) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !creation) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gunmetal/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-off-white rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-silver/30">
          <h2 className="text-lg font-black text-gunmetal">Choose Your Book Format</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-silver/20 hover:bg-silver/40 flex items-center justify-center text-blue-slate hover:text-gunmetal transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          {/* Hardcover Option */}
          <button
            onClick={() => onSelectType('hardcover')}
            className="group relative w-full p-4 bg-white rounded-xl border-2 border-silver/30 hover:border-soft-gold hover:shadow-md transition-all text-left flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-soft-gold/20 to-soft-gold/40 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-soft-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-gunmetal">Hardcover</h4>
                <span className="px-2 py-0.5 bg-soft-gold/20 text-soft-gold text-xs font-bold rounded-full">Popular</span>
              </div>
              <p className="text-xs text-blue-slate">Premium quality, lay-flat binding</p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-lg font-black text-gunmetal">$34.99</span>
            </div>
            <svg className="w-5 h-5 text-silver group-hover:text-pacific-cyan transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Softcover Option (Coming Soon) */}
          <div className="relative w-full p-4 bg-silver/10 rounded-xl border-2 border-dashed border-silver/40 text-left flex items-center gap-4 opacity-60">
            <div className="w-12 h-12 rounded-xl bg-silver/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-blue-slate">Softcover</h4>
                <span className="px-2 py-0.5 bg-silver/30 text-blue-slate text-xs font-bold rounded-full">Coming Soon</span>
              </div>
              <p className="text-xs text-silver">Flexible paperback edition</p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-lg font-black text-silver">$24.99</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Book Purchase Modal (detailed view)
const BookPurchaseModal: React.FC<BookPurchaseModalProps> = ({
  isOpen,
  onClose,
  creation,
  onPurchase,
  userId,
  userEmail,
  isGift = false,
}) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedBookType, setSelectedBookType] = useState<BookType | null>(null);
  const [orderStep, setOrderStep] = useState<OrderStep>('SELECT_TYPE');
  
  // Shipping state (recipient address for gifts)
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    street1: '',
    street2: '',
    city: '',
    stateCode: '',
    postalCode: '',
    countryCode: 'US',
    phoneNumber: '',
    email: userEmail || '',
  });

  // Billing address state (purchaser address for gifts)
  const [billingAddress, setBillingAddress] = useState<BillingAddress>({
    name: '',
    street1: '',
    street2: '',
    city: '',
    stateCode: '',
    postalCode: '',
    countryCode: 'US',
  });
  const [sameAsRecipient, setSameAsRecipient] = useState(false);

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (orderStep !== 'SELECT_TYPE') {
        setOrderStep('SELECT_TYPE');
        setSelectedBookType(null);
      } else {
        onClose();
      }
    }
  }, [onClose, orderStep]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Pre-fill email if available
      if (userEmail) {
        setShippingAddress(prev => ({ ...prev, email: userEmail }));
      }
    } else {
      // Reset everything when modal closes
      setSelectedBookType(null);
      setOrderStep('SELECT_TYPE');
      setError(null);
      setShippingOptions([]);
      setSelectedShippingId(null);
      setBillingAddress({
        name: '',
        street1: '',
        street2: '',
        city: '',
        stateCode: '',
        postalCode: '',
        countryCode: 'US',
      });
      setSameAsRecipient(false);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown, userEmail]);

  // Handle "same as recipient" checkbox for gift orders
  useEffect(() => {
    if (sameAsRecipient) {
      setBillingAddress({
        name: shippingAddress.name,
        street1: shippingAddress.street1,
        street2: shippingAddress.street2 || '',
        city: shippingAddress.city,
        stateCode: shippingAddress.stateCode,
        postalCode: shippingAddress.postalCode,
        countryCode: shippingAddress.countryCode,
      });
    }
  }, [sameAsRecipient, shippingAddress]);

  const isShippingAddressValid = () => {
    return (
      shippingAddress.name.length >= 2 &&
      shippingAddress.street1.length >= 5 &&
      shippingAddress.city.length >= 2 &&
      shippingAddress.stateCode.length === 2 &&
      shippingAddress.postalCode.length >= 5 &&
      shippingAddress.email.includes('@')
    );
  };

  const isBillingAddressValid = () => {
    return (
      billingAddress.name.length >= 2 &&
      billingAddress.street1.length >= 5 &&
      billingAddress.city.length >= 2 &&
      billingAddress.stateCode.length === 2 &&
      billingAddress.postalCode.length >= 5
    );
  };

  const isFormValid = () => {
    if (!isShippingAddressValid()) return false;
    if (isGift && !isBillingAddressValid()) return false;
    return true;
  };

  const fetchShippingRates = async () => {
    setIsLoading(true);
    setError(null);
    setOrderStep('LOADING_RATES');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in to continue');
      }

      const response = await fetch(
        `${getSupabaseUrl()}/functions/v1/get-lulu-shipping`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': getSupabaseAnonKey(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shippingAddress: {
              name: shippingAddress.name,
              street1: shippingAddress.street1,
              street2: shippingAddress.street2,
              city: shippingAddress.city,
              stateCode: shippingAddress.stateCode,
              postalCode: shippingAddress.postalCode,
              countryCode: shippingAddress.countryCode,
              phoneNumber: shippingAddress.phoneNumber,
              email: shippingAddress.email,
            },
            quantity: 1,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch shipping rates');
      }

      const data = await response.json();
      setShippingOptions(data.totals || []);
      setOrderStep('SELECT_SHIPPING');
    } catch (err: any) {
      setError(err.message);
      setOrderStep('SHIPPING');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedShippingId || !userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in to continue');
      }

      const selectedOption = shippingOptions.find(opt => opt.shippingOptionId === selectedShippingId);
      if (!selectedOption) {
        throw new Error('Invalid shipping option');
      }

      const response = await fetch(
        `${getSupabaseUrl()}/functions/v1/create-book-checkout`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': getSupabaseAnonKey(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creationId: creation?.id,
            userId: userId,
            userEmail: userEmail || shippingAddress.email,
            productType: 'hardcover',
            shippingAddress: shippingAddress,
            shippingLevelId: selectedShippingId,
            shippingCost: selectedOption.shippingCost,
            bookCost: selectedOption.productCost,
            isGift: isGift,
            billingAddress: isGift ? billingAddress : {
              name: shippingAddress.name,
              street1: shippingAddress.street1,
              street2: shippingAddress.street2 || '',
              city: shippingAddress.city,
              stateCode: shippingAddress.stateCode,
              postalCode: shippingAddress.postalCode,
              countryCode: shippingAddress.countryCode,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleCloseAll = () => {
    setSelectedBookType(null);
    setOrderStep('SELECT_TYPE');
    onClose();
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  if (!isOpen || !creation) return null;

  const features = [
    { icon: "🎨", title: "Original Artwork Cover", desc: "Your child's drawing becomes the star" },
    { icon: "📖", title: "32 Illustrated Pages", desc: "Every page brought to life with AI magic" },
    { icon: "✍️", title: "Personalized Dedication", desc: "Custom message from you to them" },
    { icon: "👶", title: "About the Artist Page", desc: "Celebrate the young creator" },
    { icon: "💎", title: "Archival Quality", desc: "Premium printing that lasts generations" },
  ];

  // Get Supabase URL from client
  const getSupabaseUrl = () => {
    // @ts-ignore - accessing internal URL from supabase client
    return supabase?.supabaseUrl || process.env.SUPABASE_URL || window.location.origin;
  };

  // Show selection modal first
  if (orderStep === 'SELECT_TYPE') {
    return (
      <BookTypeSelectionModal
        isOpen={isOpen}
        onClose={onClose}
        onSelectType={(type) => {
          setSelectedBookType(type);
          setOrderStep('DETAILS');
        }}
        creation={creation}
      />
    );
  }

  // Show detailed modal for book details and CTA
  if (orderStep === 'DETAILS') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={handleCloseAll}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-gunmetal/60 backdrop-blur-sm" />

        {/* Modal Container */}
        <div
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[2rem] bg-off-white shadow-2xl border border-silver/30 animate-in zoom-in-95 fade-in duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-soft-gold/20 to-soft-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-pacific-cyan/20 to-pacific-cyan/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={handleCloseAll}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-silver/20 hover:bg-silver/40 text-blue-slate hover:text-gunmetal flex items-center justify-center transition-all hover:rotate-90 duration-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Scrollable Content */}
          <div className="relative overflow-y-auto max-h-[90vh] p-6 md:p-8">
            <div className="space-y-6">
              {/* Back Button */}
              <button
                onClick={() => {
                  setSelectedBookType(null);
                  setOrderStep('SELECT_TYPE');
                }}
                className="flex items-center gap-2 text-blue-slate hover:text-gunmetal transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to options
              </button>

              {/* Header Badge */}
              <div className="text-center">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pacific-cyan/10 to-pacific-cyan/20 border border-pacific-cyan/30 rounded-full text-pacific-cyan text-xs font-bold uppercase tracking-widest">
                  <span className="w-2 h-2 bg-pacific-cyan rounded-full animate-pulse" />
                  Premium Print Quality
                </span>
              </div>

              {/* Title */}
              <div className="text-center space-y-2">
                <h2 className="text-3xl md:text-4xl font-black text-gunmetal">
                  Turn This Story Into a
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-soft-gold via-soft-gold to-pacific-cyan">
                    Real Keepsake Book
                  </span>
                </h2>
                <p className="text-blue-slate text-sm">A treasure they'll cherish forever</p>
              </div>

              {/* Book Preview Card */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-soft-gold/30 to-pacific-cyan/30 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="relative flex flex-col md:flex-row gap-6 p-6 bg-gradient-to-br from-silver/10 to-white rounded-3xl border border-silver/30 shadow-lg">

                  {/* Book Mockup */}
                  <div className="relative mx-auto md:mx-0 flex-shrink-0">
                    <div className="w-40 h-48 bg-gradient-to-br from-silver/30 to-silver/50 rounded-lg shadow-2xl transform rotate-[-3deg] hover:rotate-0 transition-transform duration-500 overflow-hidden">
                      {creation.thumbnailUrl ? (
                        <img src={creation.thumbnailUrl} alt="Book cover" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-soft-gold/10 to-pacific-cyan/10 p-4">
                          <div className="text-center">
                            <div className="text-4xl mb-2">📚</div>
                            <div className="text-[10px] font-bold text-blue-slate uppercase tracking-wider">Your Book</div>
                          </div>
                        </div>
                      )}
                      {/* Book Spine Effect */}
                      <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-gunmetal/20 to-transparent" />
                    </div>
                    {/* Shadow */}
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-4 bg-gunmetal/20 blur-xl rounded-full" />
                  </div>

                  {/* Book Details */}
                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <div>
                      <h3 className="text-xl font-black text-gunmetal">{creation.title}</h3>
                      <p className="text-blue-slate text-sm">A story by <span className="text-soft-gold font-semibold">{creation.artistName}</span></p>
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                      <span className="px-3 py-1.5 bg-silver/20 rounded-full text-xs font-bold text-gunmetal border border-silver/30">
                        📐 8.5" × 8.5"
                      </span>
                      <span className="px-3 py-1.5 bg-silver/20 rounded-full text-xs font-bold text-gunmetal border border-silver/30">
                        📄 32 Pages
                      </span>
                      <span className="px-3 py-1.5 bg-silver/20 rounded-full text-xs font-bold text-gunmetal border border-silver/30">
                        ✨ Hardcover
                      </span>
                    </div>

                    <div className="flex items-baseline justify-center md:justify-start gap-3">
                      <span className="text-xl font-black text-gunmetal">Starting at</span>
                      <span className="text-3xl font-black text-pacific-cyan">~$25</span>
                      <span className="text-silver text-sm">+ shipping</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-4 bg-silver/10 hover:bg-silver/20 rounded-2xl border border-silver/20 hover:border-silver/40 transition-all group"
                  >
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-soft-gold/20 to-soft-gold/30 rounded-xl text-xl group-hover:scale-110 transition-transform shadow-sm">
                      {feature.icon}
                    </div>
                    <div>
                      <div className="text-gunmetal font-bold text-sm">{feature.title}</div>
                      <div className="text-blue-slate text-xs">{feature.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => setOrderStep('SHIPPING')}
                className="w-full py-5 bg-gradient-to-r from-soft-gold via-soft-gold to-pacific-cyan hover:from-soft-gold/90 hover:to-pacific-cyan/90 text-white rounded-2xl font-black text-lg shadow-lg shadow-soft-gold/30 hover:shadow-soft-gold/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
              >
                <span className="text-2xl group-hover:animate-bounce">📖</span>
                Continue to Order
                <span className="text-2xl group-hover:animate-bounce">✨</span>
              </button>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-blue-slate font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="text-pacific-cyan">✓</span> Ships in 5-7 days
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-pacific-cyan">✓</span> Premium archival quality
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-pacific-cyan">✓</span> 100% satisfaction guaranteed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show shipping address form
  if (orderStep === 'SHIPPING') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={handleCloseAll}
      >
        <div className="absolute inset-0 bg-gunmetal/60 backdrop-blur-sm" />
        
        <div
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[2rem] bg-off-white shadow-2xl border border-silver/30"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleCloseAll}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-silver/20 hover:bg-silver/40 text-blue-slate hover:text-gunmetal flex items-center justify-center transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="overflow-y-auto max-h-[90vh] p-6 md:p-8">
            <div className="space-y-6">
              <button
                onClick={() => setOrderStep('DETAILS')}
                className="flex items-center gap-2 text-blue-slate hover:text-gunmetal transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div className="text-center">
                <h2 className="text-2xl font-black text-gunmetal mb-2">
                  {isGift ? "Recipient's Address" : "Shipping Address"}
                </h2>
                <p className="text-blue-slate text-sm">
                  {isGift ? "Where should we send this gift?" : "Where should we send your book?"}
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-center">
                  <p className="text-red-600 font-bold text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gunmetal mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={shippingAddress.name}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-silver focus:border-pacific-cyan outline-none transition-colors"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gunmetal mb-2">Email *</label>
                  <input
                    type="email"
                    value={shippingAddress.email}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-silver focus:border-pacific-cyan outline-none transition-colors"
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gunmetal mb-2">Street Address *</label>
                  <input
                    type="text"
                    value={shippingAddress.street1}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, street1: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-silver focus:border-pacific-cyan outline-none transition-colors"
                    placeholder="123 Main St"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gunmetal mb-2">Apartment, Suite, etc. (Optional)</label>
                  <input
                    type="text"
                    value={shippingAddress.street2}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, street2: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-silver focus:border-pacific-cyan outline-none transition-colors"
                    placeholder="Apt 4"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gunmetal mb-2">City *</label>
                    <input
                      type="text"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-silver focus:border-pacific-cyan outline-none transition-colors"
                      placeholder="San Francisco"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gunmetal mb-2">State *</label>
                    <select
                      value={shippingAddress.stateCode}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, stateCode: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-silver focus:border-pacific-cyan outline-none transition-colors bg-white"
                      required
                    >
                      {US_STATES.map((state) => (
                        <option key={state.code} value={state.code}>
                          {state.code ? `${state.code} - ${state.name}` : state.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gunmetal mb-2">ZIP Code *</label>
                    <input
                      type="text"
                      value={shippingAddress.postalCode}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-silver focus:border-pacific-cyan outline-none transition-colors"
                      placeholder="94102"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gunmetal mb-2">Phone (Optional)</label>
                    <input
                      type="tel"
                      value={shippingAddress.phoneNumber}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, phoneNumber: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-silver focus:border-pacific-cyan outline-none transition-colors"
                      placeholder="555-1234"
                    />
                  </div>
                </div>
              </div>

              {/* Billing Address Section - Only for gift orders */}
              {isGift && (
                <>
                  <div className="border-t border-silver/30 pt-6">
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-black text-gunmetal mb-1">Your Billing Address</h3>
                      <p className="text-blue-slate text-sm">Your address for payment confirmation</p>
                    </div>

                    {/* Same as recipient checkbox */}
                    <label className="flex items-center gap-3 p-4 bg-silver/10 rounded-xl cursor-pointer hover:bg-silver/20 transition-colors mb-4">
                      <input
                        type="checkbox"
                        checked={sameAsRecipient}
                        onChange={(e) => setSameAsRecipient(e.target.checked)}
                        className="w-5 h-5 rounded border-2 border-silver text-pacific-cyan focus:ring-pacific-cyan"
                      />
                      <span className="text-sm font-semibold text-gunmetal">Same as recipient address</span>
                    </label>

                    {!sameAsRecipient && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-gunmetal mb-2">Full Name *</label>
                          <input
                            type="text"
                            value={billingAddress.name}
                            onChange={(e) => setBillingAddress({ ...billingAddress, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border-2 border-silver focus:border-pacific-cyan outline-none transition-colors"
                            placeholder="Your name"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gunmetal mb-2">Street Address *</label>
                          <input
                            type="text"
                            value={billingAddress.street1}
                            onChange={(e) => setBillingAddress({ ...billingAddress, street1: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border-2 border-silver focus:border-pacific-cyan outline-none transition-colors"
                            placeholder="123 Main St"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gunmetal mb-2">Apartment, Suite, etc. (Optional)</label>
                          <input
                            type="text"
                            value={billingAddress.street2}
                            onChange={(e) => setBillingAddress({ ...billingAddress, street2: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border-2 border-silver focus:border-pacific-cyan outline-none transition-colors"
                            placeholder="Apt 4"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gunmetal mb-2">City *</label>
                            <input
                              type="text"
                              value={billingAddress.city}
                              onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border-2 border-silver focus:border-pacific-cyan outline-none transition-colors"
                              placeholder="San Francisco"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gunmetal mb-2">State *</label>
                            <select
                              value={billingAddress.stateCode}
                              onChange={(e) => setBillingAddress({ ...billingAddress, stateCode: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border-2 border-silver focus:border-pacific-cyan outline-none transition-colors bg-white"
                              required
                            >
                              {US_STATES.map((state) => (
                                <option key={state.code} value={state.code}>
                                  {state.code ? `${state.code} - ${state.name}` : state.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gunmetal mb-2">ZIP Code *</label>
                            <input
                              type="text"
                              value={billingAddress.postalCode}
                              onChange={(e) => setBillingAddress({ ...billingAddress, postalCode: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border-2 border-silver focus:border-pacific-cyan outline-none transition-colors"
                              placeholder="94102"
                              required
                            />
                          </div>
                          <div></div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <button
                onClick={fetchShippingRates}
                disabled={!isFormValid() || isLoading}
                className="w-full py-4 bg-gradient-to-r from-soft-gold to-pacific-cyan text-white rounded-xl font-black hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Continue to Shipping Options'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while fetching shipping rates
  if (orderStep === 'LOADING_RATES') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={handleCloseAll}
      >
        <div className="absolute inset-0 bg-gunmetal/60 backdrop-blur-sm" />
        
        <div
          className="relative w-full max-w-md bg-off-white rounded-[2rem] shadow-2xl border border-silver/30 p-12"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 border-4 border-pacific-cyan/20 border-t-pacific-cyan rounded-full animate-spin"></div>
            <div>
              <h3 className="text-xl font-black text-gunmetal mb-2">Calculating Shipping</h3>
              <p className="text-blue-slate text-sm">Finding the best rates for you...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show shipping options selection
  if (orderStep === 'SELECT_SHIPPING') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={handleCloseAll}
      >
        <div className="absolute inset-0 bg-gunmetal/60 backdrop-blur-sm" />
        
        <div
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[2rem] bg-off-white shadow-2xl border border-silver/30"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleCloseAll}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-silver/20 hover:bg-silver/40 text-blue-slate hover:text-gunmetal flex items-center justify-center transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="overflow-y-auto max-h-[90vh] p-6 md:p-8">
            <div className="space-y-6">
              <button
                onClick={() => setOrderStep('SHIPPING')}
                className="flex items-center gap-2 text-blue-slate hover:text-gunmetal transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to address
              </button>

              <div className="text-center">
                <h2 className="text-2xl font-black text-gunmetal mb-2">Select Shipping Method</h2>
                <p className="text-blue-slate text-sm">Choose your preferred delivery speed</p>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-center">
                  <p className="text-red-600 font-bold text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                {shippingOptions.map((option) => (
                  <div
                    key={option.shippingOptionId}
                    className={`border-2 rounded-2xl p-4 cursor-pointer transition-all ${
                      selectedShippingId === option.shippingOptionId
                        ? 'border-pacific-cyan bg-pacific-cyan/5'
                        : 'border-silver hover:border-silver/60'
                    }`}
                    onClick={() => setSelectedShippingId(option.shippingOptionId)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-black text-gunmetal">{option.shippingOptionName}</div>
                        <div className="text-sm text-blue-slate">
                          Delivery: {option.deliveryDays}
                        </div>
                        <div className="text-xs text-silver mt-1">
                          Book: ${(option.productCost / 100).toFixed(2)} + 
                          Shipping: ${(option.shippingCost / 100).toFixed(2)}
                        </div>
                      </div>
                      <div className="text-2xl font-black text-pacific-cyan">
                        ${(option.totalCost / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-silver/20 rounded-2xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-black text-gunmetal">Total:</span>
                  <span className="text-3xl font-black text-pacific-cyan">
                    ${selectedShippingId
                      ? (shippingOptions.find(opt => opt.shippingOptionId === selectedShippingId)!.totalCost / 100).toFixed(2)
                      : '0.00'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={!selectedShippingId || isLoading}
                className="w-full py-4 bg-gradient-to-r from-soft-gold to-pacific-cyan text-white rounded-xl font-black hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    Proceed to Payment
                    <span>🔒</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 justify-center text-xs text-silver">
                <span>Powered by</span>
                <span className="font-black text-[#635BFF]">stripe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default BookPurchaseModal;
