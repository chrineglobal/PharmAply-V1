import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Leaf, ShieldCheck, AlertCircle, X, ArrowRight, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { db, collection, query, getDocs, limit } from '../lib/firebase';
import { formatCurrency } from '../lib/utils';
import { getCategoryIcon } from '../lib/icons';

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
}

interface PatientSearchBarProps {
  onOpenStepSearch?: (queryText?: string) => void;
  className?: string;
}

export function PatientSearchBar({ onOpenStepSearch, className = "" }: PatientSearchBarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [queryText, setQueryText] = useState('');
  const debouncedQuery = useDebounce(queryText, 250);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchResults = async () => {
      const q = debouncedQuery.trim().toLowerCase();
      if (q.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      
      setLoading(true);
      const combined: any[] = [];
      const seenIds = new Set<string>();

      try {
        // 1. Search in Firestore products collection (primary real-time catalog)
        const snap = await getDocs(query(collection(db, 'products'), limit(150)));
        snap.docs.forEach((docSnap) => {
          const p = { id: docSnap.id, ...docSnap.data() } as any;
          const name = (p.name || p.commercial_name || p.nom_commercial || '').toLowerCase();
          const dci = (p.dci || p.scientific_name || '').toLowerCase();
          const category = (p.category || p.ux_category || p.categorie || '').toLowerCase();
          const dosage = (p.dosage || p.forme || '').toLowerCase();

          if (name.includes(q) || dci.includes(q) || category.includes(q) || dosage.includes(q)) {
            if (!seenIds.has(p.id)) {
              seenIds.add(p.id);
              combined.push({
                id: p.id,
                nom_commercial: p.commercial_name || p.name || p.nom_commercial,
                dci: p.dci || p.scientific_name,
                form: p.form || p.forme || 'Boîte',
                dosage: p.dosage || '',
                price: p.price ? Number(p.price) : 2500,
                category_name: p.category || p.ux_category || 'Général',
                is_prescription_required: Boolean(p.is_prescription_required || p.ordonnance_requise || p.requires_prescription),
                is_essentiel: Boolean(p.is_essentiel),
                is_recalled: Boolean(p.is_recalled),
                image_url: p.image_url || p.imageUrl || p.image,
                stock: p.stock !== undefined ? Number(p.stock) : 10
              });
            }
          }
        });

        // 2. Fallback / supplementary search from Supabase RPC or table if available
        try {
          const { data: supaData } = await supabase.rpc('search_medicines_for_patients', {
            search_term: debouncedQuery
          });
          if (Array.isArray(supaData)) {
            supaData.forEach((p: any) => {
              if (!seenIds.has(p.id)) {
                seenIds.add(p.id);
                combined.push(p);
              }
            });
          }
        } catch (supaErr) {
          // Ignore if Supabase RPC is optional
        }

        setResults(combined.slice(0, 10));
        setIsOpen(combined.length > 0 || q.length >= 2);
      } catch (err) {
        console.error("Error searching medicines:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResults();
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputRef.current) {
      inputRef.current.blur();
    } else {
      (document.activeElement as HTMLElement)?.blur();
    }
    setIsOpen(false);
    const trimmed = queryText.trim();
    if (onOpenStepSearch) {
      onOpenStepSearch(trimmed);
      return;
    }
    if (trimmed) {
      navigate(`/patient/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/patient/search');
    }
  };

  const handleSelectProduct = (product: any) => {
    setIsOpen(false);
    if (inputRef.current) inputRef.current.blur();
    const name = product.nom_commercial || product.name || product.dci || '';
    if (onOpenStepSearch) {
      onOpenStepSearch(name);
      return;
    }
    if (product.id) {
      navigate(`/patient/product/${product.id}`);
    } else {
      navigate(`/patient/search?q=${encodeURIComponent(name)}`);
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <form onSubmit={handleSearchSubmit} action="" method="get" className="relative flex items-center w-full">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#0E7673] dark:text-[#38B794] z-10">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </div>
        <input
          ref={inputRef}
          type="search"
          name="q"
          enterKeyHint="search"
          inputMode="search"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          className="block w-full min-h-[56px] sm:min-h-[60px] pl-12 sm:pl-14 pr-12 py-4 border border-[#CFE4E3] dark:border-[#145250] rounded-full leading-5 bg-white dark:bg-[#0A3D3B] placeholder:text-[#6EADAB] text-[#0A3D3B] dark:text-white focus:outline-none focus:border-[#0E7673] dark:focus:border-[#38B794] focus:ring-4 focus:ring-[#0E7673]/15 text-[15px] sm:text-base font-medium transition-all shadow-sm cursor-text"
          placeholder={t('search_bar.placeholder', 'Rechercher un médicament, symptôme...')}
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          onFocus={() => {
            if (results.length > 0 || queryText.length >= 2) {
              setIsOpen(true);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearchSubmit();
            }
          }}
        />
        {queryText.length > 0 && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center z-10">
            <button
              type="button"
              onClick={() => {
                setQueryText('');
                setResults([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="p-2 text-[#6EADAB] hover:text-[#0E7673] dark:hover:text-white rounded-full hover:bg-[#E7F1F1] dark:hover:bg-[#062625] transition active:scale-95"
              aria-label="Effacer le champ de recherche"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {/* Hidden button enabling standard mobile keyboard form submit */}
        <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>

      {/* Autocomplete Results Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-[#0A3D3B] shadow-2xl max-h-[26rem] rounded-3xl py-2 text-sm overflow-y-auto border border-[#CFE4E3] dark:border-[#145250]">
          {results.length > 0 ? (
            <>
              <div className="px-4 py-2 border-b border-[#E7F1F1] dark:border-[#145250] flex items-center justify-between text-[11px] font-bold text-[#0E7673] dark:text-[#9FC8C7]">
                <span>{t('search_bar.suggested_results', 'Résultats suggérés')} ({results.length})</span>
                <button
                  type="button"
                  onClick={() => handleSearchSubmit()}
                  className="text-[#0E7673] dark:text-[#38B794] hover:underline flex items-center gap-0.5 font-bold"
                >
                  {t('search_bar.view_all_catalog', 'Voir tout le catalogue')} <ArrowRight size={12} />
                </button>
              </div>

              <div className="divide-y divide-[#E7F1F1] dark:divide-[#145250]">
                {results.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="p-3.5 hover:bg-[#F5FAFA] dark:hover:bg-[#062625] cursor-pointer transition flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-[#E7F1F1] dark:bg-[#062625] shrink-0 overflow-hidden flex items-center justify-center p-1 border border-[#CFE4E3] dark:border-[#145250]">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="w-full h-full object-contain" />
                        ) : (
                          getCategoryIcon(product.category_name, 20)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-[#0A3D3B] dark:text-white text-xs sm:text-sm truncate group-hover:text-[#0E7673] dark:group-hover:text-[#38B794] transition-colors">
                            {product.nom_commercial || product.name || product.dci}
                          </p>
                          {product.is_prescription_required && (
                            <span className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900">
                              {t('search_bar.prescription_tag', 'Ordonnance')}
                            </span>
                          )}
                          {product.is_essentiel && (
                            <span className="bg-[#D7F1EA] text-[#0A3D3B] text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {t('search_bar.essential_tag', 'Essentiel')}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#0E7673] dark:text-[#9FC8C7] truncate mt-0.5">
                          {product.dci ? `DCI: ${product.dci} • ` : ''}{product.dosage || product.form || product.category_name}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-bold text-xs sm:text-sm text-[#0E7673] dark:text-[#38B794]">
                        {product.price ? formatCurrency(product.price) : t('search_bar.in_stock', 'En stock')}
                      </p>
                      <span className="text-[10px] text-[#0A3D3B]/70 dark:text-[#9FC8C7] font-medium">{t('search_bar.available', 'Disponible')}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 bg-[#F5FAFA] dark:bg-[#062625] border-t border-[#CFE4E3] dark:border-[#145250] text-center">
                <button
                  type="button"
                  onClick={() => handleSearchSubmit()}
                  className="w-full py-2.5 bg-[#0E7673] hover:bg-[#0A5A58] text-white rounded-full text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Search size={13} />
                  <span>{t('search_bar.show_all_results_for', { query: queryText, defaultValue: `Afficher tous les résultats pour « ${queryText} »` })}</span>
                </button>
              </div>
            </>
          ) : (
            !loading && queryText.length >= 2 && (
              <div className="p-6 text-center text-xs text-[#0A3D3B] dark:text-[#CFE4E3] space-y-2">
                <Search className="mx-auto h-6 w-6 text-[#6EADAB]" />
                <p className="font-bold">{t('search_bar.no_meds_found', { query: queryText, defaultValue: `Aucun médicament trouvé pour « ${queryText} »` })}</p>
                <p className="text-[11px] text-[#0E7673] dark:text-[#9FC8C7]">{t('search_bar.press_search_hint', 'Appuyez sur la touche Entrée de votre clavier pour explorer tout le catalogue.')}</p>
                <button
                  type="button"
                  onClick={() => handleSearchSubmit()}
                  className="mt-2 px-5 py-2.5 bg-[#0E7673] text-white rounded-full text-xs font-bold inline-flex items-center gap-1"
                >
                  {t('search_bar.search_full_catalog', 'Rechercher dans le catalogue complet')}
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
