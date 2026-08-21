const fs = require('fs');

let content = fs.readFileSync('src/pages/patient/SmartScanner.tsx', 'utf8');

// The history card starts around line 592
const oldCard = `                  <div
                    key={item.id}
                    className="bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-gray-200 dark:border-zinc-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-gray-200 dark:border-zinc-700 flex items-center justify-center">
                          {item.fileUrl ? (
                            <img src={item.fileUrl} alt="Ordonnance" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display='none'; if(e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.classList.remove('hidden'); }} />
<FileText size={20} className="text-teal-500 hidden" />
                          ) : (
                            <FileText size={20} className="text-teal-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm truncate max-w-[200px]">
                            {item.fileName || "Ordonnance Médicale"}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                            <Clock size={12} />
                            {dateObj ? dateObj.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Récemment"}
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-950 text-teal-400 border border-teal-800">
                        {item.status || "Validé IA"}
                      </span>
                    </div>

                    {/* Médicaments extraits */}
                    {meds.length > 0 && (
                      <div className="bg-slate-50 dark:bg-gray-50 dark:bg-zinc-950/60 rounded-xl p-2.5 border border-gray-200 dark:border-gray-100 dark:border-zinc-800/80">
                        <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 mb-1.5">
                          {meds.length} Médicament(s) prescrit(s) :
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {meds.map((m: any, idx: number) => (
                            <span
                              key={idx}
                              className="bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 text-[11px] px-2 py-0.5 rounded-md border border-gray-200 dark:border-zinc-700 flex items-center gap-1"
                            >
                              <Pill size={10} className="text-yellow-400" />
                              {m.nom_medicament} {m.dosage ? \`(\${m.dosage})\` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-gray-200 dark:border-zinc-800/60">
                      {item.fileUrl && (
                        <button
                          onClick={() => window.open(item.fileUrl, "_blank")}
                          className="text-xs text-teal-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <Eye size={13} /> Voir document
                        </button>
                      )}
                      <button
                        onClick={() => {`;

const newCard = `                  <div
                    key={item.id}
                    className="bg-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-teal-500/30 transition shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-zinc-800 overflow-hidden shrink-0 border border-gray-200 dark:border-zinc-700 flex items-center justify-center relative">
                          {item.fileUrl ? (
                            <>
                              <img src={item.fileUrl} alt="Ordonnance" className="w-full h-full object-cover absolute inset-0 z-10" onError={(e) => { e.currentTarget.style.display='none'; if(e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.classList.remove('hidden'); }} />
                              <FileText size={20} className="text-[var(--app-primary-color)] hidden absolute z-0" />
                            </>
                          ) : (
                            <FileText size={20} className="text-[var(--app-primary-color)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white text-[15px] truncate block w-full">
                            {item.fileName || "Ordonnance Médicale"}
                          </p>
                          <p className="text-[12px] text-gray-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                            <Clock size={12} />
                            {dateObj ? dateObj.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Récemment"}
                          </p>
                        </div>
                      </div>

                      <span className="px-2 py-1 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0 bg-teal-50 dark:bg-teal-950/50 text-[var(--app-primary-color)] dark:text-teal-400 border border-teal-200 dark:border-teal-800/60 max-w-[100px] sm:max-w-none text-center leading-tight">
                        {(item.status || "Validé IA").replace('_', ' ')}
                      </span>
                    </div>

                    {/* Médicaments extraits */}
                    {meds.length > 0 && (
                      <div className="bg-gray-50 dark:bg-zinc-950/40 rounded-xl p-3 border border-gray-100 dark:border-zinc-800/50">
                        <p className="text-[12px] font-bold text-gray-600 dark:text-zinc-400 mb-2">
                          {meds.length} Médicament(s) prescrit(s)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {meds.map((m: any, idx: number) => (
                            <span
                              key={idx}
                              className="bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 text-[11px] px-2.5 py-1 rounded border border-gray-200 dark:border-zinc-700 flex items-center gap-1.5 shadow-sm"
                            >
                              <Pill size={12} className="text-yellow-500 dark:text-yellow-400" />
                              {m.nom_medicament} {m.dosage ? \`(\${m.dosage})\` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100 dark:border-zinc-800/60 gap-3">
                      {item.fileUrl && (
                        <button
                          onClick={() => window.open(item.fileUrl, "_blank")}
                          className="text-[13px] text-[var(--app-primary-color)] dark:text-teal-400 font-bold hover:opacity-80 flex items-center gap-1.5 px-2"
                        >
                          <Eye size={14} /> Voir doc.
                        </button>
                      )}
                      <button
                        onClick={() => {`;

if (content.includes(oldCard.split('\n')[0].trim())) { // Check if we can find the start of the card
    // Since whitespace might differ, let's just do a string replace of the exact chunk
    content = content.replace(oldCard, newCard);
    fs.writeFileSync('src/pages/patient/SmartScanner.tsx', content);
    console.log("Card layout updated.");
} else {
    console.log("Could not find the exact old card format.");
}

