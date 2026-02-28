import React, { useState, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Printer, Sparkles, Database, ChevronDown,
  Eye, EyeOff, Loader2, CheckCircle, XCircle, Save,
  Power, Zap, X, BookOpen,
} from 'lucide-react';
import { useSettings, useBulkUpdateSettings } from '../../../hooks/useSettings';
import { useTestIntegration, type TestResult } from '../../../hooks/useTestIntegration';

// ============================================================================
// Sub-Components
// ============================================================================

interface SecretInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
}

const SecretInput = memo<SecretInputProps>(({ label, value, onChange, placeholder, helpText }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 text-sm bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pacific-cyan/40 focus:border-pacific-cyan transition-colors font-mono"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {helpText && <p className="text-xs text-slate-400 mt-1">{helpText}</p>}
    </div>
  );
});
SecretInput.displayName = 'SecretInput';

// ---

type HealthStatus = 'healthy' | 'warning' | 'error';

interface IntegrationHealth {
  status: HealthStatus;
  label: string;
  metrics: { label: string; value: string }[];
}

interface HealthCardProps {
  title: string;
  icon: React.ReactNode;
  health: IntegrationHealth;
  onClick: () => void;
  mode?: string;
}

const healthDotColor: Record<HealthStatus, string> = {
  healthy: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
};

const HealthCard = memo<HealthCardProps>(({ title, icon, health, onClick, mode }) => (
  <button
    onClick={onClick}
    className="bg-white border border-slate-200 rounded-lg p-4 text-left hover:border-slate-300 hover:shadow-sm transition-all w-full"
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-slate-400">{icon}</span>
        <span className="text-sm font-medium text-slate-900">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {mode && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
            mode === 'live' || mode === 'production'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {mode}
          </span>
        )}
        <span className={`w-2 h-2 rounded-full ${healthDotColor[health.status]}`} />
      </div>
    </div>
    <p className="text-xs text-slate-500 mb-2">{health.label}</p>
    <div className="space-y-1">
      {health.metrics.map((m) => (
        <div key={m.label} className="flex justify-between text-xs">
          <span className="text-slate-400">{m.label}</span>
          <span className="text-slate-700 font-medium">{m.value}</span>
        </div>
      ))}
    </div>
  </button>
));
HealthCard.displayName = 'HealthCard';

// ---

interface IntegrationSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  health: IntegrationHealth;
  children: React.ReactNode;
}

const IntegrationSection = memo<IntegrationSectionProps>(({ id, title, icon, expanded, onToggle, health, children }) => (
  <div id={`section-${id}`} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-slate-400">{icon}</span>
        <span className="text-sm font-medium text-slate-900">{title}</span>
        <span className={`w-2 h-2 rounded-full ${healthDotColor[health.status]}`} />
      </div>
      <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
        <ChevronDown size={16} className="text-slate-400" />
      </motion.div>
    </button>
    <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-5">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
));
IntegrationSection.displayName = 'IntegrationSection';

// ============================================================================
// Toggle Component
// ============================================================================

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

const Toggle = memo<ToggleProps>(({ checked, onChange, label }) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-emerald-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
    <span className="text-sm text-slate-700">{label}</span>
  </label>
));
Toggle.displayName = 'Toggle';

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_INTEGRATION_SETTINGS: Record<string, { value: any; dataType: string }> = {
  // Stripe
  stripe_enabled: { value: false, dataType: 'boolean' },
  stripe_mode: { value: 'test', dataType: 'string' },
  stripe_publishable_key_test: { value: '', dataType: 'string' },
  stripe_publishable_key_live: { value: '', dataType: 'string' },
  stripe_secret_key_test: { value: '', dataType: 'string' },
  stripe_secret_key_live: { value: '', dataType: 'string' },
  stripe_webhook_secret_test: { value: '', dataType: 'string' },
  stripe_webhook_secret_live: { value: '', dataType: 'string' },
  // Lulu
  lulu_enabled: { value: false, dataType: 'boolean' },
  lulu_mode: { value: 'sandbox', dataType: 'string' },
  lulu_client_key_sandbox: { value: '', dataType: 'string' },
  lulu_client_secret_sandbox: { value: '', dataType: 'string' },
  lulu_client_key_production: { value: '', dataType: 'string' },
  lulu_client_secret_production: { value: '', dataType: 'string' },
  // Gemini
  gemini_enabled: { value: false, dataType: 'boolean' },
  gemini_api_key: { value: '', dataType: 'string' },
  // Supabase (display-only)
  supabase_url: { value: '', dataType: 'string' },
  supabase_anon_key: { value: '', dataType: 'string' },
};

const DEFAULT_PRODUCT_SETTINGS: Record<string, { value: any; dataType: string }> = {
  ebook_enabled: { value: true, dataType: 'boolean' },
  softcover_enabled: { value: true, dataType: 'boolean' },
  hardcover_enabled: { value: true, dataType: 'boolean' },
};

// ============================================================================
// Health Helpers
// ============================================================================

function getConnectionStatus(enabled: boolean, hasCredentials: boolean): 'connected' | 'disconnected' | 'error' {
  if (!enabled) return 'disconnected';
  if (!hasCredentials) return 'error';
  return 'connected';
}

function toHealthStatus(status: 'connected' | 'disconnected' | 'error'): HealthStatus {
  if (status === 'disconnected') return 'warning';
  if (status === 'error') return 'error';
  return 'healthy';
}

function getHealthLabel(status: 'connected' | 'disconnected' | 'error'): string {
  if (status === 'disconnected') return 'Disabled';
  if (status === 'error') return 'Missing credentials';
  return 'Connected';
}

// ============================================================================
// Main Component
// ============================================================================

const Integrations: React.FC = () => {
  const { settings, isLoading, refetch } = useSettings();
  const { bulkUpdate, loading: saving } = useBulkUpdateSettings();
  const { testConnection, testing } = useTestIntegration();

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [productData, setProductData] = useState<Record<string, any>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    products: false, stripe: false, lulu: false, gemini: false, supabase: false,
  });
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testModal, setTestModal] = useState<{
    integration: string; result: TestResult;
  } | null>(null);

  // Initialize form data from DB + defaults
  useEffect(() => {
    const integrationSettings = settings.integrations || {};
    const newFormData: Record<string, any> = {};

    // Start with defaults
    Object.entries(DEFAULT_INTEGRATION_SETTINGS).forEach(([key, config]) => {
      newFormData[key] = integrationSettings[key] ?? config.value;
    });

    // Pull in any DB keys not in defaults
    Object.entries(integrationSettings).forEach(([key, value]) => {
      if (!(key in newFormData)) newFormData[key] = value;
    });

    // Map legacy keys to mode-specific fields for Stripe
    const stripeMode = newFormData.stripe_mode || 'test';
    const stripeSuffix = stripeMode === 'live' ? '_live' : '_test';
    ['stripe_publishable_key', 'stripe_secret_key', 'stripe_webhook_secret'].forEach((legacyKey) => {
      const modeKey = `${legacyKey}${stripeSuffix}`;
      if (!newFormData[modeKey] && newFormData[legacyKey]) {
        newFormData[modeKey] = newFormData[legacyKey];
      }
    });

    // Map legacy keys for Lulu
    const luluMode = newFormData.lulu_mode || 'sandbox';
    const luluSuffix = luluMode === 'production' ? '_production' : '_sandbox';
    ['lulu_client_key', 'lulu_client_secret'].forEach((legacyKey) => {
      const modeKey = `${legacyKey}${luluSuffix}`;
      if (!newFormData[modeKey] && newFormData[legacyKey]) {
        newFormData[modeKey] = newFormData[legacyKey];
      }
    });

    setFormData(newFormData);

    // Initialize product availability settings
    const productSettings = settings.products || {};
    const newProductData: Record<string, any> = {};
    Object.entries(DEFAULT_PRODUCT_SETTINGS).forEach(([key, config]) => {
      newProductData[key] = productSettings[key] ?? config.value;
    });
    setProductData(newProductData);
  }, [settings]);

  const updateField = useCallback((key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateProductField = useCallback((key: string, value: any) => {
    setProductData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const scrollToSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: true }));
    setTimeout(() => {
      document.getElementById(`section-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  // Save handler
  const handleSave = async () => {
    const settingsToSave: Record<string, { value: any; dataType: string }> = {};

    // Map all defaults
    Object.entries(DEFAULT_INTEGRATION_SETTINGS).forEach(([key, config]) => {
      settingsToSave[key] = { value: formData[key] ?? config.value, dataType: config.dataType };
    });

    // Resolve active Stripe keys
    const stripeMode = formData.stripe_mode || 'test';
    const stripeSuffix = stripeMode === 'live' ? '_live' : '_test';
    settingsToSave.stripe_publishable_key = {
      value: formData[`stripe_publishable_key${stripeSuffix}`] || '',
      dataType: 'string',
    };
    settingsToSave.stripe_secret_key = {
      value: formData[`stripe_secret_key${stripeSuffix}`] || '',
      dataType: 'string',
    };
    settingsToSave.stripe_webhook_secret = {
      value: formData[`stripe_webhook_secret${stripeSuffix}`] || '',
      dataType: 'string',
    };

    // Resolve active Lulu keys
    const luluMode = formData.lulu_mode || 'sandbox';
    const luluSuffix = luluMode === 'production' ? '_production' : '_sandbox';
    settingsToSave.lulu_client_key = {
      value: formData[`lulu_client_key${luluSuffix}`] || '',
      dataType: 'string',
    };
    settingsToSave.lulu_client_secret = {
      value: formData[`lulu_client_secret${luluSuffix}`] || '',
      dataType: 'string',
    };

    // Save product availability settings
    const productSettingsToSave: Record<string, { value: any; dataType: string }> = {};
    Object.entries(DEFAULT_PRODUCT_SETTINGS).forEach(([key, config]) => {
      productSettingsToSave[key] = { value: productData[key] ?? config.value, dataType: config.dataType };
    });

    const [integrationSuccess, productSuccess] = await Promise.all([
      bulkUpdate('integrations', settingsToSave),
      bulkUpdate('products', productSettingsToSave),
    ]);

    if (integrationSuccess && productSuccess) {
      setSaveMessage({ type: 'success', text: 'Settings saved successfully' });
      refetch();
    } else {
      setSaveMessage({ type: 'error', text: 'Failed to save some settings' });
    }
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // Test handler
  const handleTestConnection = async (integration: string) => {
    const result = await testConnection(integration);
    setTestModal({ integration, result });
  };

  // Compute health statuses
  const stripeStatus = getConnectionStatus(
    !!formData.stripe_enabled,
    !!(formData.stripe_secret_key_test || formData.stripe_secret_key_live)
  );
  const luluStatus = getConnectionStatus(
    !!formData.lulu_enabled,
    !!(formData.lulu_client_key_sandbox || formData.lulu_client_key_production)
  );
  const geminiStatus = getConnectionStatus(!!formData.gemini_enabled, !!formData.gemini_api_key);

  const enabledProducts = [
    productData.ebook_enabled && 'Ebook',
    productData.softcover_enabled && 'Softcover',
    productData.hardcover_enabled && 'Hardcover',
  ].filter(Boolean);

  const health = {
    products: {
      status: (enabledProducts.length === 3 ? 'healthy' : enabledProducts.length > 0 ? 'warning' : 'error') as HealthStatus,
      label: enabledProducts.length === 3 ? 'All enabled' : enabledProducts.length > 0 ? `${enabledProducts.length}/3 enabled` : 'All disabled',
      metrics: [
        { label: 'Ebook', value: productData.ebook_enabled ? 'On' : 'Off' },
        { label: 'Softcover', value: productData.softcover_enabled ? 'On' : 'Off' },
        { label: 'Hardcover', value: productData.hardcover_enabled ? 'On' : 'Off' },
      ],
    } as IntegrationHealth,
    stripe: {
      status: toHealthStatus(stripeStatus),
      label: getHealthLabel(stripeStatus),
      metrics: [
        { label: 'Mode', value: formData.stripe_mode || 'test' },
        { label: 'Keys', value: (formData.stripe_secret_key_test ? 'Test ' : '') + (formData.stripe_secret_key_live ? 'Live' : '') || 'None' },
      ],
    } as IntegrationHealth,
    lulu: {
      status: toHealthStatus(luluStatus),
      label: getHealthLabel(luluStatus),
      metrics: [
        { label: 'Mode', value: formData.lulu_mode || 'sandbox' },
      ],
    } as IntegrationHealth,
    gemini: {
      status: toHealthStatus(geminiStatus),
      label: getHealthLabel(geminiStatus),
      metrics: [
        { label: 'API Key', value: formData.gemini_api_key ? 'Configured' : 'Not set' },
      ],
    } as IntegrationHealth,
    supabase: {
      status: 'healthy' as HealthStatus,
      label: 'Connected',
      metrics: [
        { label: 'Status', value: 'Active' },
      ],
    } as IntegrationHealth,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 mt-0.5">Manage API keys and integration settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Save message */}
      <AnimatePresence>
        {saveMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`px-4 py-3 rounded-md text-sm font-medium ${
              saveMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {saveMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Health Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <HealthCard
          title="Products"
          icon={<BookOpen size={16} />}
          health={health.products}
          onClick={() => scrollToSection('products')}
        />
        <HealthCard
          title="Stripe"
          icon={<CreditCard size={16} />}
          health={health.stripe}
          onClick={() => scrollToSection('stripe')}
          mode={formData.stripe_mode || 'test'}
        />
        <HealthCard
          title="Lulu"
          icon={<Printer size={16} />}
          health={health.lulu}
          onClick={() => scrollToSection('lulu')}
          mode={formData.lulu_mode || 'sandbox'}
        />
        <HealthCard
          title="Gemini"
          icon={<Sparkles size={16} />}
          health={health.gemini}
          onClick={() => scrollToSection('gemini')}
        />
        <HealthCard
          title="Supabase"
          icon={<Database size={16} />}
          health={health.supabase}
          onClick={() => scrollToSection('supabase')}
        />
      </div>

      {/* ================================================================ */}
      {/* PRODUCT AVAILABILITY SECTION */}
      {/* ================================================================ */}
      <IntegrationSection
        id="products"
        title="Product Availability"
        icon={<BookOpen size={16} />}
        expanded={expandedSections.products}
        onToggle={() => toggleSection('products')}
        health={health.products}
      >
        <p className="text-xs text-slate-500">
          Control which book editions are available for purchase. Disabled editions show as "Coming Soon" in the store.
        </p>
        <div className="space-y-4">
          <Toggle
            checked={!!productData.ebook_enabled}
            onChange={(v) => updateProductField('ebook_enabled', v)}
            label="Digital Ebook"
          />
          <Toggle
            checked={!!productData.softcover_enabled}
            onChange={(v) => updateProductField('softcover_enabled', v)}
            label="Softcover Book"
          />
          <Toggle
            checked={!!productData.hardcover_enabled}
            onChange={(v) => updateProductField('hardcover_enabled', v)}
            label="Hardcover Book"
          />
        </div>
      </IntegrationSection>

      {/* ================================================================ */}
      {/* STRIPE SECTION */}
      {/* ================================================================ */}
      <IntegrationSection
        id="stripe"
        title="Stripe Payment Gateway"
        icon={<CreditCard size={16} />}
        expanded={expandedSections.stripe}
        onToggle={() => toggleSection('stripe')}
        health={health.stripe}
      >
        <Toggle
          checked={!!formData.stripe_enabled}
          onChange={(v) => updateField('stripe_enabled', v)}
          label="Enable Stripe"
        />

        {/* Mode selector */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">Mode</label>
          <div className="flex gap-2">
            <button
              onClick={() => updateField('stripe_mode', 'test')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                formData.stripe_mode !== 'live'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              }`}
            >
              Test
            </button>
            <button
              onClick={() => updateField('stripe_mode', 'live')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                formData.stripe_mode === 'live'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              }`}
            >
              Live
            </button>
          </div>
        </div>

        {/* Dual key columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg border-2 space-y-3 transition-colors ${
            formData.stripe_mode !== 'live' ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200 bg-slate-50/30'
          }`}>
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Test Keys</h4>
            <SecretInput
              label="Publishable Key"
              value={formData.stripe_publishable_key_test || ''}
              onChange={(v) => updateField('stripe_publishable_key_test', v)}
              placeholder="pk_test_..."
            />
            <SecretInput
              label="Secret Key"
              value={formData.stripe_secret_key_test || ''}
              onChange={(v) => updateField('stripe_secret_key_test', v)}
              placeholder="sk_test_..."
            />
            <SecretInput
              label="Webhook Secret"
              value={formData.stripe_webhook_secret_test || ''}
              onChange={(v) => updateField('stripe_webhook_secret_test', v)}
              placeholder="whsec_..."
            />
          </div>
          <div className={`p-4 rounded-lg border-2 space-y-3 transition-colors ${
            formData.stripe_mode === 'live' ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/30'
          }`}>
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Live Keys</h4>
            <SecretInput
              label="Publishable Key"
              value={formData.stripe_publishable_key_live || ''}
              onChange={(v) => updateField('stripe_publishable_key_live', v)}
              placeholder="pk_live_..."
            />
            <SecretInput
              label="Secret Key"
              value={formData.stripe_secret_key_live || ''}
              onChange={(v) => updateField('stripe_secret_key_live', v)}
              placeholder="sk_live_..."
            />
            <SecretInput
              label="Webhook Secret"
              value={formData.stripe_webhook_secret_live || ''}
              onChange={(v) => updateField('stripe_webhook_secret_live', v)}
              placeholder="whsec_..."
            />
          </div>
        </div>

        {/* Test Connection */}
        <button
          onClick={() => handleTestConnection('stripe')}
          disabled={!!testing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {testing === 'stripe' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {testing === 'stripe' ? 'Testing...' : 'Test Connection'}
        </button>
      </IntegrationSection>

      {/* ================================================================ */}
      {/* LULU SECTION */}
      {/* ================================================================ */}
      <IntegrationSection
        id="lulu"
        title="Lulu Print-on-Demand"
        icon={<Printer size={16} />}
        expanded={expandedSections.lulu}
        onToggle={() => toggleSection('lulu')}
        health={health.lulu}
      >
        <Toggle
          checked={!!formData.lulu_enabled}
          onChange={(v) => updateField('lulu_enabled', v)}
          label="Enable Lulu"
        />

        {/* Mode selector */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2">Mode</label>
          <div className="flex gap-2">
            <button
              onClick={() => updateField('lulu_mode', 'sandbox')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                formData.lulu_mode !== 'production'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              }`}
            >
              Sandbox
            </button>
            <button
              onClick={() => updateField('lulu_mode', 'production')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                formData.lulu_mode === 'production'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              }`}
            >
              Production
            </button>
          </div>
        </div>

        {/* Dual key columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg border-2 space-y-3 transition-colors ${
            formData.lulu_mode !== 'production' ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200 bg-slate-50/30'
          }`}>
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Sandbox</h4>
            <SecretInput
              label="Client Key"
              value={formData.lulu_client_key_sandbox || ''}
              onChange={(v) => updateField('lulu_client_key_sandbox', v)}
              placeholder="Sandbox client key"
            />
            <SecretInput
              label="Client Secret"
              value={formData.lulu_client_secret_sandbox || ''}
              onChange={(v) => updateField('lulu_client_secret_sandbox', v)}
              placeholder="Sandbox client secret"
            />
          </div>
          <div className={`p-4 rounded-lg border-2 space-y-3 transition-colors ${
            formData.lulu_mode === 'production' ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/30'
          }`}>
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Production</h4>
            <SecretInput
              label="Client Key"
              value={formData.lulu_client_key_production || ''}
              onChange={(v) => updateField('lulu_client_key_production', v)}
              placeholder="Production client key"
            />
            <SecretInput
              label="Client Secret"
              value={formData.lulu_client_secret_production || ''}
              onChange={(v) => updateField('lulu_client_secret_production', v)}
              placeholder="Production client secret"
            />
          </div>
        </div>

        {/* Test Connection */}
        <button
          onClick={() => handleTestConnection('lulu')}
          disabled={!!testing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {testing === 'lulu' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {testing === 'lulu' ? 'Testing...' : 'Test Connection'}
        </button>
      </IntegrationSection>

      {/* ================================================================ */}
      {/* GEMINI SECTION */}
      {/* ================================================================ */}
      <IntegrationSection
        id="gemini"
        title="Google Gemini AI"
        icon={<Sparkles size={16} />}
        expanded={expandedSections.gemini}
        onToggle={() => toggleSection('gemini')}
        health={health.gemini}
      >
        <Toggle
          checked={!!formData.gemini_enabled}
          onChange={(v) => updateField('gemini_enabled', v)}
          label="Enable Gemini"
        />

        <SecretInput
          label="API Key"
          value={formData.gemini_api_key || ''}
          onChange={(v) => updateField('gemini_api_key', v)}
          placeholder="AIza..."
          helpText="Google AI Studio API key for Gemini models"
        />

        {/* Test Connection */}
        <button
          onClick={() => handleTestConnection('gemini')}
          disabled={!!testing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {testing === 'gemini' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {testing === 'gemini' ? 'Testing...' : 'Test Connection'}
        </button>
      </IntegrationSection>

      {/* ================================================================ */}
      {/* SUPABASE SECTION */}
      {/* ================================================================ */}
      <IntegrationSection
        id="supabase"
        title="Supabase"
        icon={<Database size={16} />}
        expanded={expandedSections.supabase}
        onToggle={() => toggleSection('supabase')}
        health={health.supabase}
      >
        <div className="bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Connected</span>
          </div>
          <p className="text-xs text-emerald-600 mt-1">
            Supabase is active — the admin panel is running through it.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Project URL</label>
            <input
              type="text"
              value={formData.supabase_url || import.meta.env.VITE_SUPABASE_URL || ''}
              readOnly
              className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-md text-slate-600 font-mono cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Anon Key</label>
            <input
              type="text"
              value={formData.supabase_anon_key || import.meta.env.VITE_SUPABASE_ANON_KEY || ''}
              readOnly
              className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-md text-slate-600 font-mono cursor-not-allowed truncate"
            />
          </div>
        </div>
      </IntegrationSection>

      {/* ================================================================ */}
      {/* TEST RESULT MODAL */}
      {/* ================================================================ */}
      <AnimatePresence>
        {testModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setTestModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {testModal.result.success ? (
                    <CheckCircle size={24} className="text-emerald-500" />
                  ) : (
                    <XCircle size={24} className="text-red-500" />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 capitalize">
                      {testModal.integration}
                    </h3>
                    <p className="text-sm text-slate-500">Connection Test</p>
                  </div>
                </div>
                <button
                  onClick={() => setTestModal(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className={`px-4 py-3 rounded-md text-sm mb-4 ${
                testModal.result.success
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {testModal.result.message}
              </div>

              {testModal.result.details && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Details</h4>
                  <div className="bg-slate-900 text-green-400 rounded-md p-4 overflow-x-auto">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(testModal.result.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <button
                onClick={() => setTestModal(null)}
                className="w-full mt-4 px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Integrations;
