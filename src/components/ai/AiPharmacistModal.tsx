import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  MapPin, 
  Navigation, 
  AlertTriangle, 
  ShieldCheck, 
  RotateCcw, 
  Compass, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Zap,
  Brain,
  RefreshCw
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
  usedMaps?: boolean;
  isQuotaFallback?: boolean;
  isError?: boolean;
  retryText?: string;
  mapsPlaces?: Array<{
    title?: string;
    uri?: string;
    reviewSnippets?: string[];
  }>;
  groundingChunks?: any[];
}

interface AiPharmacistModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const QUICK_PROMPTS = [
  { label: "🚨 Pharmacie de garde proche", query: "Quelles sont les pharmacies de garde et ouvertes les plus proches de ma position ?" },
  { label: "💊 Posologie & conseils", query: "Quelles sont les précautions et posologies usuelles pour le Paracétamol et l'Ibuprofène ?" },
  { label: "⚠️ Interactions médicamenteuses", query: "Est-ce qu'il y a un risque d'interaction entre l'amoxicilline et d'autres médicaments ?" },
  { label: "📋 Expliquer une ordonnance", query: "Comment bien prendre les médicaments prescrits sur mon ordonnance et à quel moment de la journée ?" },
];

export function AiPharmacistModal({ isOpen, onClose, initialQuery }: AiPharmacistModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'welcome',
        role: 'model',
        text: `Bonjour ! Je suis l'assistant pharmacien clinique IA de **PharmAply** 🩺.

Je peux vous conseiller sur :
* **Pharmacies de garde & ouvertes** en temps réel avec localisation certifiée via **Google Maps**
* **Posologies, indications & précautions d'emploi**
* **Interactions médicamenteuses** et effets indésirables
* **Explications d'ordonnances** & préparation de votre commande

*Comment puis-je vous aider aujourd'hui ?*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.8-flash'
      }
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon'>('gemini-3.8-flash');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locatingStatus, setLocatingStatus] = useState<'idle' | 'locating' | 'ready' | 'denied'>('idle');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Request user geolocation on mount or when modal opens
  useEffect(() => {
    if (isOpen && locatingStatus === 'idle') {
      getUserLocation();
    }
  }, [isOpen, locatingStatus]);

  // Handle initial query if provided
  useEffect(() => {
    if (isOpen && initialQuery && initialQuery.trim().length > 0) {
      sendMessage(initialQuery);
    }
  }, [isOpen, initialQuery]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocatingStatus('denied');
      return;
    }
    setLocatingStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
        setLocatingStatus('ready');
      },
      (err) => {
        console.warn('Geolocation denied or unavailable:', err);
        // Fallback default coordinates (Douala, Cameroon - PharmAply primary hub)
        setUserLocation({ latitude: 4.0511, longitude: 9.7679 });
        setLocatingStatus('ready');
      },
      { timeout: 7000 }
    );
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        role: 'model',
        text: `Discussion réinitialisée. Comment puis-je vous accompagner concernant vos médicaments ou la recherche de pharmacies ?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel
      }
    ]);
  };

  const sendMessage = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend || !textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.text
          })),
          userLocation: userLocation || { latitude: 4.0511, longitude: 9.7679 },
          model: selectedModel,
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la réponse du pharmacien IA.');
      }

      const botMsg: ChatMessage = {
        id: 'resp-' + Date.now(),
        role: 'model',
        text: data.text || "Je n'ai pas pu formuler de réponse détaillée. N'hésitez pas à reformuler votre question.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.model || selectedModel,
        usedMaps: data.usedMaps,
        isQuotaFallback: data.isQuotaFallback,
        mapsPlaces: data.mapsPlaces || [],
        groundingChunks: data.groundingChunks || []
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chat AI error:', err);
      const rawError = String(err?.message || err || '');
      let cleanText = "Le service d'analyse IA est actuellement très sollicité. Veuillez réessayer dans quelques instants.";
      if (rawError.includes('429') || rawError.includes('quota') || rawError.includes('RESOURCE_EXHAUSTED')) {
        cleanText = "Le quota temporaire de l'IA a été atteint en raison d'une forte affluence.";
      } else if (!rawError.includes('{') && rawError.length < 250) {
        cleanText = rawError;
      }

      const errorMsg: ChatMessage = {
        id: 'err-' + Date.now(),
        role: 'model',
        text: `⚠️ **Service temporairement très sollicité**\n\n${cleanText}\n\n🩺 **Conseil d'urgence immédiat :**\n• En cas d'urgence vitale, composez sans attendre le **15 (SAMU)** ou le **112**.\n• Vous pouvez consulter les pharmacies ouvertes et de garde dans l'onglet Recherche de l'application.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
        retryText: textToSend,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full h-full sm:h-[88vh] sm:max-w-2xl bg-white dark:bg-slate-900 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 dark:border-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-pharmacist-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white px-4 py-3 sm:px-6 sm:py-4 shrink-0 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-emerald-200 ring-2 ring-white/20">
              <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="ai-pharmacist-title" className="font-semibold text-base sm:text-lg tracking-tight">
                  Pharmacien Conseil IA
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/25 text-emerald-100 border border-emerald-300/30">
                  Google Maps Grounding
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                PharmAply • Conseils certifiés & Pharmacies de garde
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleClearHistory}
              title="Nouvelle conversation"
              className="p-2 rounded-xl text-emerald-100/80 hover:text-white hover:bg-white/10 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-emerald-100/80 hover:text-white hover:bg-white/10 transition"
              aria-label="Fermer la fenêtre"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-bar: Emergency disclaimer & Model selection */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/60 dark:border-amber-800/40 px-3 py-1.5 flex items-center justify-between text-[11px] text-amber-900 dark:text-amber-200 shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">
              <strong>Urgence vitale ?</strong> Appelez le <strong>15</strong> (SAMU) ou le <strong>112</strong>.
            </span>
          </div>

          {/* Model picker */}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">Modèle :</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as any)}
              className="text-[11px] font-medium bg-white dark:bg-slate-800 border border-amber-300/70 dark:border-amber-700/60 rounded-lg px-2 py-0.5 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="gemini-3.8-flash">gemini-3.8-flash (Standard & Maps)</option>
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra-rapide)</option>
              <option value="gemini-4-argon">gemini-4-argon (Expert clinique)</option>
            </select>
          </div>
        </div>

        {/* Geolocation indicator banner */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-slate-800 px-3 py-1.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>
              {locatingStatus === 'ready' 
                ? "Position détectée pour la recherche de pharmacies" 
                : locatingStatus === 'locating' 
                ? "Localisation en cours..." 
                : "Position par défaut (Douala)"}
            </span>
          </div>
          <button
            onClick={getUserLocation}
            className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <Compass className="w-3 h-3" />
            Actualiser ma position
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                {msg.role === 'model' ? (
                  <>
                    <span className="font-semibold text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      PharmAply IA
                    </span>
                    {msg.modelUsed && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        • {msg.modelUsed}
                      </span>
                    )}
                    {msg.isQuotaFallback && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 font-medium inline-flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                        Mode Relais Officine
                      </span>
                    )}
                  </>
                ) : (
                  <span className="font-semibold text-xs text-slate-600 dark:text-slate-400">
                    Vous
                  </span>
                )}
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {msg.timestamp}
                </span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-3.5 sm:p-4 shadow-sm text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : msg.isError
                    ? 'bg-amber-50 dark:bg-amber-950/30 text-slate-800 dark:text-slate-100 border border-amber-300 dark:border-amber-800/60 rounded-tl-none'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-tl-none'
                }`}
              >
                {/* Formatted body */}
                <div className="whitespace-pre-line space-y-1">
                  {msg.text}
                </div>

                {/* Retry action on error */}
                {msg.isError && msg.retryText && (
                  <div className="mt-3 pt-2.5 border-t border-amber-200 dark:border-amber-800/50 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-amber-900/70 dark:text-amber-200/70">
                      Une demande urgente ?
                    </span>
                    <button
                      onClick={() => sendMessage(msg.retryText)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Réessayer
                    </button>
                  </div>
                )}

                {/* Grounding Places Card (Google Maps Grounding results) */}
                {msg.mapsPlaces && msg.mapsPlaces.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                      Pharmacies identifiées ({msg.mapsPlaces.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {msg.mapsPlaces.map((place, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col justify-between hover:border-emerald-500 transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                              <span className="truncate">{place.title || "Pharmacie Partenaire"}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-medium">
                                Certifié Maps
                              </span>
                            </div>
                            {place.reviewSnippets && place.reviewSnippets.length > 0 && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 italic">
                                &ldquo;{place.reviewSnippets[0]}&rdquo;
                              </p>
                            )}
                          </div>

                          {place.uri && (
                            <a
                              href={place.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 pt-1"
                            >
                              <span>Voir l'itinéraire sur Google Maps</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex flex-col items-start animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="font-semibold text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500 animate-spin" />
                  PharmAply IA
                </span>
                <span className="text-[10px] text-slate-400">Analyse clinique et cartographique en cours...</span>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Consultation des données pharmaceutiques et de garde...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div className="px-3 py-2 bg-white dark:bg-slate-900 border-t border-slate-200/70 dark:border-slate-800 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => sendMessage(qp.query)}
              disabled={isLoading}
              className="text-xs shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-slate-700 transition font-medium flex items-center gap-1 disabled:opacity-50"
            >
              <span>{qp.label}</span>
              <ChevronRight className="w-3 h-3 text-emerald-500" />
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question (médicament, ordonnance, pharmacie de garde)..."
                disabled={isLoading}
                className="w-full pl-4 pr-10 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition"
              />
              <button
                type="button"
                onClick={getUserLocation}
                title="Actualiser la géolocalisation pour Google Maps"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition"
              >
                <MapPin className="w-4 h-4" />
              </button>
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-12 h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-center hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition shrink-0 active:scale-95"
              aria-label="Envoyer le message"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-2">
            L'IA fournit des conseils pharmaceutiques généraux et ne remplace pas une consultation médicale.
          </p>
        </div>
      </div>
    </div>
  );
}
