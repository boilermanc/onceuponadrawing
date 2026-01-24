<template>
  <div class="max-w-2xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Order Your Hardcover Book</h1>

    <!-- Error Message -->
    <div
      v-if="error"
      class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4"
    >
      {{ error }}
    </div>

    <!-- Step 1: Shipping Address -->
    <div v-if="step === 'address'" class="space-y-4">
      <h2 class="text-xl font-semibold mb-4">Shipping Address</h2>

      <div>
        <label class="block text-sm font-medium mb-1">Full Name *</label>
        <input
          v-model="address.name"
          type="text"
          class="w-full border rounded px-3 py-2"
          required
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Email *</label>
        <input
          v-model="address.email"
          type="email"
          class="w-full border rounded px-3 py-2"
          required
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Street Address *</label>
        <input
          v-model="address.street1"
          type="text"
          class="w-full border rounded px-3 py-2"
          required
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">
          Apartment, Suite, Unit (Optional)
        </label>
        <input
          v-model="address.street2"
          type="text"
          class="w-full border rounded px-3 py-2"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">City *</label>
          <input
            v-model="address.city"
            type="text"
            class="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">State *</label>
          <input
            v-model="address.stateCode"
            type="text"
            class="w-full border rounded px-3 py-2"
            placeholder="CA"
            maxlength="2"
            required
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">ZIP Code *</label>
          <input
            v-model="address.postalCode"
            type="text"
            class="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Phone (Optional)</label>
          <input
            v-model="address.phoneNumber"
            type="tel"
            class="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      <button
        @click="fetchShippingRates"
        :disabled="loading || !isAddressValid"
        class="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {{ loading ? 'Loading...' : 'Continue to Shipping' }}
      </button>
    </div>

    <!-- Step 2: Shipping Options -->
    <div v-if="step === 'shipping' && shippingOptions" class="space-y-4">
      <button
        @click="step = 'address'"
        class="text-blue-600 hover:underline mb-4"
      >
        ← Back to address
      </button>

      <h2 class="text-xl font-semibold mb-4">Select Shipping Method</h2>

      <div class="space-y-3">
        <div
          v-for="option in shippingOptions.totals"
          :key="option.shippingOptionId"
          :class="[
            'border-2 rounded-lg p-4 cursor-pointer transition',
            selectedShipping === option.shippingOptionId
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          ]"
          @click="selectedShipping = option.shippingOptionId"
        >
          <div class="flex justify-between items-start">
            <div>
              <div class="font-semibold">{{ option.shippingOptionName }}</div>
              <div class="text-sm text-gray-600">
                Delivery: {{ option.deliveryDays }} business days
              </div>
              <div class="text-xs text-gray-500 mt-1">
                Book: ${{ (option.productCost / 100).toFixed(2) }} +
                Shipping: ${{ (option.shippingCost / 100).toFixed(2) }}
              </div>
            </div>
            <div class="text-xl font-bold">
              ${{ (option.totalCost / 100).toFixed(2) }}
            </div>
          </div>
        </div>
      </div>

      <div class="bg-gray-50 rounded-lg p-4 mt-6">
        <div class="flex justify-between items-center">
          <span class="text-lg font-semibold">Total:</span>
          <span class="text-2xl font-bold">
            ${{ selectedTotalCost }}
          </span>
        </div>
      </div>

      <button
        @click="handleCheckout"
        :disabled="loading || !selectedShipping"
        class="w-full bg-green-600 text-white py-3 rounded font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {{ loading ? 'Processing...' : 'Proceed to Payment' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Vue 3 Composition API Example - Hardcover Book Order Page
 * 
 * This component demonstrates the complete order flow:
 * 1. User enters shipping address
 * 2. Fetch shipping options from Lulu API
 * 3. User selects shipping method
 * 4. Create Stripe checkout session with all details
 * 5. Redirect to Stripe for payment
 */

import { ref, computed, onMounted } from 'vue';
import { createClient } from '@supabase/supabase-js';

// Props
const props = defineProps<{
  creationId: string;
}>();

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Fixed product specifications
const FIXED_PAGE_COUNT = 32;
const FIXED_PRODUCT_CODE = '0850X0850FCPRESS060UW444MXX';

// Types
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

// State
const step = ref<'address' | 'shipping' | 'loading'>('address');
const loading = ref(false);
const error = ref<string | null>(null);

const address = ref<ShippingAddress>({
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

const shippingOptions = ref<ShippingResponse | null>(null);
const selectedShipping = ref<string | null>(null);
const user = ref<any>(null);

// Computed
const isAddressValid = computed(() => {
  return (
    address.value.name &&
    address.value.street1 &&
    address.value.city &&
    address.value.stateCode &&
    address.value.postalCode &&
    address.value.email
  );
});

const selectedTotalCost = computed(() => {
  if (!selectedShipping.value || !shippingOptions.value) return '0.00';
  const option = shippingOptions.value.totals.find(
    (opt) => opt.shippingOptionId === selectedShipping.value
  );
  return option ? (option.totalCost / 100).toFixed(2) : '0.00';
});

// Methods
const fetchShippingRates = async () => {
  loading.value = true;
  error.value = null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lulu-shipping`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shippingAddress: {
            name: address.value.name,
            street1: address.value.street1,
            street2: address.value.street2,
            city: address.value.city,
            stateCode: address.value.stateCode,
            postalCode: address.value.postalCode,
            countryCode: address.value.countryCode,
            phoneNumber: address.value.phoneNumber,
            email: address.value.email,
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
    shippingOptions.value = data;
    step.value = 'shipping';
  } catch (err: any) {
    error.value = err.message;
    console.error('Error fetching shipping rates:', err);
  } finally {
    loading.value = false;
  }
};

const handleCheckout = async () => {
  if (!selectedShipping.value || !shippingOptions.value) {
    error.value = 'Please select a shipping option';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !user.value) {
      throw new Error('Not authenticated');
    }

    // Find selected shipping option details
    const selectedOption = shippingOptions.value.totals.find(
      (opt) => opt.shippingOptionId === selectedShipping.value
    );

    if (!selectedOption) {
      throw new Error('Invalid shipping option');
    }

    // Create checkout session
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-book-checkout`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creationId: props.creationId,
          userId: user.value.id,
          userEmail: user.value.email,
          productType: 'hardcover',
          dedicationText: '', // Optional: add a form field for dedication
          shippingAddress: address.value,
          shippingLevelId: selectedShipping.value,
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
    error.value = err.message;
    console.error('Error creating checkout:', err);
    loading.value = false;
  }
};

// Lifecycle
onMounted(async () => {
  // Get current user
  const { data } = await supabase.auth.getUser();
  user.value = data.user;
  if (data.user?.email) {
    address.value.email = data.user.email;
  }
});
</script>

<style scoped>
/* Add any custom styles here */
</style>
