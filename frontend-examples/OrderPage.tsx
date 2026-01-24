/**
 * React/TypeScript Example - Hardcover Book Order Page
 * 
 * This component demonstrates the complete order flow:
 * 1. User enters shipping address
 * 2. Fetch shipping options from Lulu API
 * 3. User selects shipping method
 * 4. Create Stripe checkout session with all details
 * 5. Redirect to Stripe for payment
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Fixed product specifications
const FIXED_PAGE_COUNT = 32;
const FIXED_PRODUCT_CODE = '0850X0850FCPRESS060UW444MXX';

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

interface ShippingOption {
  id: string;
  name: string;
  cost: number;
  currency: string;
  deliveryDays: string;
  totalCost: number; // Book cost + shipping
}

interface ShippingResponse {
  success: boolean;
  pricing: {
    unitCost: number;
    currency: string;
  };
  shippingOptions: Array<{
    id: string;
    name: string;
    cost: number;
    currency: string;
    deliveryDays: string;
  }>;
  totals: Array<{
    shippingOptionId: string;
    shippingOptionName: string;
    productCost: number;
    shippingCost: number;
    totalCost: number;
    currency: string;
    deliveryDays: string;
  }>;
}

export default function OrderPage({ creationId }: { creationId: string }) {
  const [step, setStep] = useState<'address' | 'shipping' | 'loading'>('address');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Shipping address form
  const [address, setAddress] = useState<ShippingAddress>({
    name: '',
    street1: '',
    street2: '',
    city: '',
    stateCode: '',
    postalCode: '',
    countryCode: 'US',
    phoneNumber: '',
    email: '',
  });

  // Shipping options from Lulu
  const [shippingOptions, setShippingOptions] = useState<ShippingResponse | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);

  // User info
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user?.email) {
        setAddress(prev => ({ ...prev, email: data.user.email }));
      }
    });
  }, []);

  // Step 1: Get shipping rates from Lulu
  const fetchShippingRates = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-lulu-shipping`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shippingAddress: {
              name: address.name,
              street1: address.street1,
              street2: address.street2,
              city: address.city,
              stateCode: address.stateCode,
              postalCode: address.postalCode,
              countryCode: address.countryCode,
              phoneNumber: address.phoneNumber,
              email: address.email,
            },
            quantity: 1,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch shipping rates');
      }

      const data: ShippingResponse = await response.json();
      setShippingOptions(data);
      setStep('shipping');
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching shipping rates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Create checkout session and redirect to Stripe
  const handleCheckout = async () => {
    if (!selectedShipping || !shippingOptions) {
      setError('Please select a shipping option');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !user) {
        throw new Error('Not authenticated');
      }

      // Find selected shipping option details
      const selectedOption = shippingOptions.totals.find(
        opt => opt.shippingOptionId === selectedShipping
      );

      if (!selectedOption) {
        throw new Error('Invalid shipping option');
      }

      // Create checkout session
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-book-checkout`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creationId: creationId,
            userId: user.id,
            userEmail: user.email,
            productType: 'hardcover',
            dedicationText: '', // Optional: add a form field for dedication
            shippingAddress: address,
            shippingLevelId: selectedShipping,
            shippingCost: Math.round(selectedOption.shippingCost * 100), // Convert to cents
            bookCost: Math.round(selectedOption.productCost * 100), // Convert to cents
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err: any) {
      setError(err.message);
      console.error('Error creating checkout:', err);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Order Your Hardcover Book</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Step 1: Shipping Address */}
      {step === 'address' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <input
              type="text"
              value={address.name}
              onChange={(e) => setAddress({ ...address, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              value={address.email}
              onChange={(e) => setAddress({ ...address, email: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Street Address *</label>
            <input
              type="text"
              value={address.street1}
              onChange={(e) => setAddress({ ...address, street1: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Apartment, Suite, Unit (Optional)
            </label>
            <input
              type="text"
              value={address.street2}
              onChange={(e) => setAddress({ ...address, street2: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City *</label>
              <input
                type="text"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">State *</label>
              <input
                type="text"
                value={address.stateCode}
                onChange={(e) => setAddress({ ...address, stateCode: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="CA"
                maxLength={2}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">ZIP Code *</label>
              <input
                type="text"
                value={address.postalCode}
                onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone (Optional)</label>
              <input
                type="tel"
                value={address.phoneNumber}
                onChange={(e) => setAddress({ ...address, phoneNumber: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <button
            onClick={fetchShippingRates}
            disabled={loading || !address.name || !address.street1 || !address.city || 
                     !address.stateCode || !address.postalCode || !address.email}
            className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Continue to Shipping'}
          </button>
        </div>
      )}

      {/* Step 2: Shipping Options */}
      {step === 'shipping' && shippingOptions && (
        <div className="space-y-4">
          <button
            onClick={() => setStep('address')}
            className="text-blue-600 hover:underline mb-4"
          >
            ← Back to address
          </button>

          <h2 className="text-xl font-semibold mb-4">Select Shipping Method</h2>

          <div className="space-y-3">
            {shippingOptions.totals.map((option) => (
              <div
                key={option.shippingOptionId}
                className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                  selectedShipping === option.shippingOptionId
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedShipping(option.shippingOptionId)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{option.shippingOptionName}</div>
                    <div className="text-sm text-gray-600">
                      Delivery: {option.deliveryDays} business days
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Book: ${(option.productCost / 100).toFixed(2)} + 
                      Shipping: ${(option.shippingCost / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-xl font-bold">
                    ${(option.totalCost / 100).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mt-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-2xl font-bold">
                $
                {selectedShipping
                  ? (
                      shippingOptions.totals.find(
                        (opt) => opt.shippingOptionId === selectedShipping
                      )!.totalCost / 100
                    ).toFixed(2)
                  : '0.00'}
              </span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || !selectedShipping}
            className="w-full bg-green-600 text-white py-3 rounded font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Proceed to Payment'}
          </button>
        </div>
      )}
    </div>
  );
}
