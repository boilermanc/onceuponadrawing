import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  subtitle,
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-500">{title}</span>
        <Icon size={18} className="text-slate-400" />
      </div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      {(change || subtitle) && (
        <div className="flex items-center gap-1.5 mt-1">
          {change && (
            <span
              className={`flex items-center gap-0.5 text-xs font-medium ${
                changeType === 'positive'
                  ? 'text-emerald-600'
                  : changeType === 'negative'
                  ? 'text-red-600'
                  : 'text-slate-500'
              }`}
            >
              {changeType === 'positive' && <TrendingUp size={12} />}
              {changeType === 'negative' && <TrendingDown size={12} />}
              {change}
            </span>
          )}
          {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
