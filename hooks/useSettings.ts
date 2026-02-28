import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

// Types
export interface ConfigSetting {
  id: string;
  category: string;
  key: string;
  value: any;
  data_type: 'string' | 'number' | 'boolean' | 'json' | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type SettingsMap = Record<string, Record<string, any>>;

// Parse value from DB text to JS type
function parseValue(value: any, dataType: string | null): any {
  if (value === null || value === undefined) return value;

  // Already the target JS type — return directly
  if (dataType === 'boolean' && typeof value === 'boolean') return value;
  if (dataType === 'number' && typeof value === 'number') return value;
  if (dataType === 'json' && typeof value === 'object') return value;

  let strValue = String(value);

  // Strip double-encoding: "\"actual value\"" -> "actual value"
  if (strValue.startsWith('"') && strValue.endsWith('"')) {
    try {
      const unwrapped = JSON.parse(strValue);
      if (typeof unwrapped === 'string') strValue = unwrapped;
    } catch { /* keep as-is */ }
  }

  switch (dataType) {
    case 'number': return parseFloat(strValue) || 0;
    case 'boolean': return strValue === 'true' || strValue === '1';
    case 'json':
      try { return JSON.parse(strValue); } catch { return strValue; }
    default: return strValue;
  }
}

// Stringify value for DB storage
function stringifyValue(value: any, dataType: string): string {
  switch (dataType) {
    case 'json': return JSON.stringify(value);
    case 'boolean': return value ? 'true' : 'false';
    default: return String(value ?? '');
  }
}

// Hook 1: Fetch ALL settings grouped by category
export function useSettings() {
  const { data: settings = {}, isLoading, error, refetch } = useQuery<SettingsMap>({
    queryKey: ['config-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config_settings')
        .select('*')
        .order('category')
        .order('key');

      if (error) throw error;

      const grouped: SettingsMap = {};
      for (const row of (data || []) as ConfigSetting[]) {
        if (!grouped[row.category]) grouped[row.category] = {};
        grouped[row.category][row.key] = parseValue(row.value, row.data_type);
      }
      return grouped;
    },
    staleTime: 30_000,
  });

  return { settings, isLoading, error, refetch };
}

// Hook 2: Fetch a single setting
export function useSetting(category: string, key: string) {
  const { data: value, isLoading, error, refetch } = useQuery({
    queryKey: ['config-setting', category, key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config_settings')
        .select('*')
        .eq('category', category)
        .eq('key', key)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return parseValue(data.value, data.data_type);
    },
    staleTime: 30_000,
  });

  return { value, isLoading, error, refetch };
}

// Hook 3: Update a single setting (upsert)
export function useUpdateSetting() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSetting = async (
    category: string,
    key: string,
    value: any,
    dataType: string = 'string',
    description?: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const { error: upsertError } = await supabase
        .from('config_settings')
        .upsert(
          {
            category,
            key,
            value: stringifyValue(value, dataType),
            data_type: dataType,
            ...(description !== undefined && { description }),
          },
          { onConflict: 'category,key' }
        );

      if (upsertError) throw upsertError;
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update setting');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { updateSetting, loading, error };
}

// Hook 4: Bulk update multiple settings at once
export function useBulkUpdateSettings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bulkUpdate = async (
    category: string,
    settingsRecord: Record<string, { value: any; dataType: string; description?: string }>
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const records = Object.entries(settingsRecord).map(([key, config]) => ({
        category,
        key,
        value: stringifyValue(config.value, config.dataType),
        data_type: config.dataType,
        ...(config.description !== undefined && { description: config.description }),
      }));

      const { error: upsertError } = await supabase
        .from('config_settings')
        .upsert(records, { onConflict: 'category,key' });

      if (upsertError) throw upsertError;
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { bulkUpdate, loading, error };
}

