const fs = require('fs');

let tracking = fs.readFileSync('src/pages/patient/Tracking.tsx', 'utf8');

const productModalUI = `
      {/* MODAL DE NOTATION DES PRODUITS */}
      {showProductRatingModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 border border-gray-100 dark:border-zinc-800 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3.5">
              <div>
                <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
                  Notez vos produits
                </h3>
                <p className="text-xs text-gray-500">
                  Votre avis est précieux pour les autres patients
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowProductRatingModal(false);
                  if (driver) setTimeout(() => setShowRatingModal(true), 500);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center justify-center"
              >✕</button>
            </div>

            <div className="space-y-4">
              {order?.items?.map((item: any) => (
                <div key={item.id} className="border border-gray-100 dark:border-zinc-800 p-3 rounded-2xl">
                  <p className="font-bold text-sm text-gray-800 dark:text-white mb-2">{item.name || item.commercial_name}</p>
                  
                  <div className="flex justify-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => {
                       const currentRating = productRatings[item.id]?.rating || 5;
                       return (
                         <button
                           key={star}
                           type="button"
                           onClick={() => setProductRatings(prev => ({...prev, [item.id]: { ...prev[item.id], rating: star }}))}
                           className="p-1 focus:outline-none"
                         >
                           <Star size={24} className={currentRating >= star ? "fill-[#FACC15] text-[#FACC15]" : "text-gray-300 dark:text-zinc-700"} />
                         </button>
                       );
                    })}
                  </div>
                  
                  <textarea
                    placeholder="Qu'avez-vous pensé de ce produit ?"
                    className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--app-primary-color)] outline-none resize-none placeholder-gray-400 text-gray-800 dark:text-white"
                    rows={2}
                    value={productRatings[item.id]?.comment || ''}
                    onChange={(e) => setProductRatings(prev => ({...prev, [item.id]: { ...prev[item.id], comment: e.target.value }}))}
                  ></textarea>
                </div>
              ))}
            </div>

            <button
              disabled={loadingRatings}
              onClick={submitProductRatings}
              className="w-full py-3.5 bg-[var(--app-primary-color)] hover:opacity-90 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"
            >
              {loadingRatings ? <Loader2 size={18} className="animate-spin" /> : <ThumbsUp size={18} />}
              {loadingRatings ? "Envoi en cours..." : "Soumettre les avis"}
            </button>
          </div>
        </div>
      )}
`;

if (!tracking.includes('MODAL DE NOTATION DES PRODUITS')) {
    tracking = tracking.replace('{/* MODAL DE NOTATION & CONFIRMATION DE LIVRAISON */}', `${productModalUI}\n\n      {/* MODAL DE NOTATION & CONFIRMATION DE LIVRAISON */}`);
}

fs.writeFileSync('src/pages/patient/Tracking.tsx', tracking);
