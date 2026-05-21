import { SchemaOrganization } from '../types';
import { Database, Shield } from 'lucide-react';

interface BrokerCardProps {
  broker: SchemaOrganization;
  isSelected: boolean;
  onSelect: (broker: SchemaOrganization) => void;
}

export function BrokerCard({ broker, isSelected, onSelect }: BrokerCardProps) {
  return (
    <button
      onClick={() => onSelect(broker)}
      className={`
        w-full text-left p-5 rounded-lg border transition-all duration-300 relative overflow-hidden group
        ${isSelected 
          ? 'bg-[var(--color-brand-surface)] border-[var(--color-brand-primary)] shadow-[0_0_20px_rgba(22,137,115,0.2)]' 
          : 'bg-black/40 border-[var(--color-brand-element)] hover:border-[#168973]/50 hover:bg-[var(--color-brand-dark)]'}
      `}
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-[var(--color-brand-primary)]/10 to-transparent opacity-0 transition-opacity duration-500 ${isSelected ? 'opacity-100' : 'group-hover:opacity-100'}`} />
      
      <div className="relative flex items-start gap-4 h-full">
        <div className={`p-3 rounded-lg border flex-shrink-0 transition-colors ${isSelected ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]' : 'border-[var(--color-brand-element)] text-[var(--color-brand-primary)]/50 group-hover:text-[var(--color-brand-primary)]'}`}>
          <Database size={24} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-[var(--color-brand-glow)] truncate mb-1">
            {broker.name}
          </h3>
          <p className="text-sm font-mono text-[var(--color-brand-primary)]/70 truncate flex items-center gap-1.5 mb-3">
             <Shield size={12} /> {broker.contactPoint.contactType}
          </p>
          <p className="text-xs font-mono text-white/50 truncate">
            Target: {broker.email}
          </p>
        </div>
      </div>
      
      {isSelected && (
        <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center bg-[var(--color-brand-primary)] text-[var(--color-brand-dark)] rounded-bl-lg">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      )}
    </button>
  );
}
