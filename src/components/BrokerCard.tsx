import { memo } from 'react';
import { SchemaOrganization } from '../types';
import { Database, Shield, ExternalLink, MapPin } from 'lucide-react';

interface BrokerCardProps {
  broker: SchemaOrganization;
  isSelected: boolean;
  onSelect: (broker: SchemaOrganization) => void;
  t?: any; // To allow using translations
}

function BrokerCardImpl({ broker, isSelected, onSelect, t }: BrokerCardProps) {
  return (
    <button
      onClick={() => onSelect(broker)}
      className={`
        w-full text-left p-4 rounded-lg border transition-all duration-300 relative overflow-hidden group cursor-pointer
        ${isSelected 
          ? 'bg-[var(--color-brand-surface)] border-[var(--color-brand-primary)] shadow-[0_0_15px_rgba(22,137,115,0.15)]' 
          : 'bg-black/40 border-[var(--color-brand-element)] hover:border-[#168973]/50 hover:bg-[var(--color-brand-dark)]'}
      `}
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-[var(--color-brand-primary)]/10 to-transparent opacity-0 transition-opacity duration-500 ${isSelected ? 'opacity-100' : 'group-hover:opacity-100'}`} />
      
      <div className="relative flex items-start gap-4 h-full">
        <div className="flex flex-col items-center gap-3">
            <div className={`p-3 rounded-lg border flex-shrink-0 transition-colors ${isSelected ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]' : 'border-[var(--color-brand-element)] text-[var(--color-brand-primary)]/50 group-hover:text-[var(--color-brand-primary)]'}`}>
              <Database size={20} />
            </div>
            
            {broker.url && (
              <a 
                href={broker.url} 
                target="_blank" 
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()} 
                className="text-[var(--color-brand-primary)]/50 hover:text-[var(--color-brand-glow)] hover:bg-[var(--color-brand-element)]/50 rounded-md transition-colors p-2.5 mt-[-4px]"
                title={t?.app?.directivePolicy || "Privacy Policy"}
              >
                <ExternalLink size={18} />
              </a>
            )}
        </div>
        
        <div className="flex-1 min-w-0 py-1">
          <h3 className="text-base font-medium text-[var(--color-brand-glow)] truncate mb-1">
            {broker.name}
          </h3>
          <p className="text-xs font-mono text-[var(--color-brand-primary)]/70 truncate flex items-center gap-1.5 mb-3">
             <Shield size={12} /> {t?.brokers?.contactTypes[broker.contactPoint.contactType as keyof typeof t.brokers.contactTypes] || broker.contactPoint.contactType}
          </p>
          {broker.address && broker.address.length > 0 && (
            <div className="text-[10px] font-mono text-white/40 flex items-start gap-1.5">
              <MapPin size={10} className="mt-0.5 shrink-0 opacity-70" />
              <div className="flex flex-col truncate">
                <span className="truncate">{broker.address[0]}</span>
                {broker.address[1] && <span className="truncate">{broker.address[1]}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {isSelected && (
        <div className="absolute top-0 right-0 w-6 h-6 flex items-center justify-center bg-[var(--color-brand-primary)] text-[var(--color-brand-dark)] rounded-bl-lg">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      )}
    </button>
  );
}

export const BrokerCard = memo(BrokerCardImpl);
