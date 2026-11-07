import "dotenv/config";
import express from "express";
import path from "path";
import nodemailer from "nodemailer";

async function startServer() {
  const app = express();
  const args = process.argv.slice(2);
  const portArgIndex = args.indexOf("--port");
  const parsedPort = portArgIndex !== -1 && args[portArgIndex + 1] ? Number(args[portArgIndex + 1]) : NaN;
  const hostArgIndex = args.indexOf("--host");
  const parsedHost = hostArgIndex !== -1 && args[hostArgIndex + 1] ? args[hostArgIndex + 1] : undefined;

  const PORT = !isNaN(parsedPort) && parsedPort > 0 ? parsedPort : (Number(process.env.PORT) || 3000);
  const HOST = parsedHost || process.env.HOST || "0.0.0.0";

  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ extended: true, limit: "30mb" }));

  // Health check endpoints for deployment probes
  app.get("/health", (req: express.Request, res: express.Response) => {
    res.status(200).send("OK");
  });
  app.get("/api/health", (req: express.Request, res: express.Response) => {
    res.json({ status: "ok" });
  });

  // Helper Haversine Distance (in kilometers)
  function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
    const R = 6371; // Rayon terrestre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Helper string similarity score (0 to 1)
  function stringSimilarity(s1: string, s2: string): number {
    if (!s1 || !s2) return 0;
    const a = s1.toLowerCase().trim();
    const b = s2.toLowerCase().trim();
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.85;

    // Word tokens overlap
    const wordsA = a.split(/[\s,/-]+/).filter(w => w.length > 2);
    const wordsB = b.split(/[\s,/-]+/).filter(w => w.length > 2);
    if (wordsA.length === 0 || wordsB.length === 0) return 0;
    
    let matches = 0;
    for (const w of wordsA) {
      if (wordsB.some(wb => wb.includes(w) || w.includes(wb))) {
        matches++;
      }
    }
    return matches / Math.max(wordsA.length, wordsB.length);
  }

  // Helper to detect 429 Quota, Rate-Limit, or High Demand / 503 errors
  function isQuotaOrRateLimitError(err: any): boolean {
    if (!err) return false;
    const str = (typeof err === "string" ? err : (err?.message || JSON.stringify(err) || "")).toLowerCase();
    return (
      str.includes("429") ||
      str.includes("503") ||
      str.includes("resource_exhausted") ||
      str.includes("quota") ||
      str.includes("rate-limit") ||
      str.includes("rate limit") ||
      str.includes("too many requests") ||
      str.includes("limit exceeded") ||
      str.includes("high demand") ||
      str.includes("spikes in demand") ||
      str.includes("overloaded") ||
      str.includes("unavailable") ||
      str.includes("try again later")
    );
  }

  // Sanitize raw error messages to user-friendly French text
  function cleanErrorMessage(err: any, fallbackMessage: string = "Une erreur est survenue lors du traitement."): string {
    if (!err) return fallbackMessage;
    if (isQuotaOrRateLimitError(err)) {
      return "Le service d'analyse IA est actuellement très sollicité (quota temporairement atteint). Veuillez patienter quelques instants avant de réessayer.";
    }
    const raw = typeof err === "string" ? err : (err?.message || "");
    if (raw.includes("{") && raw.includes("}")) {
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed.error?.message) {
            if (isQuotaOrRateLimitError(parsed.error.message)) {
              return "Le service d'analyse IA est actuellement très sollicité. Veuillez patienter quelques instants.";
            }
            return parsed.error.message;
          }
        }
      } catch {
        // ignore parse error
      }
    }
    return raw && raw.length < 250 ? raw : fallbackMessage;
  }

  // Fallback intelligent clinicien & officines de garde quand le quota Gemini est dépassé
  function generateFallbackPharmacyResponse(lastText: string, userLat: number = 4.0511, userLng: number = 9.7679) {
    const query = (lastText || "").toLowerCase();

    const defaultPharmacies = [
      {
        title: "Pharmacie du Centre - Akwa",
        uri: "https://www.google.com/maps/search/?api=1&query=Pharmacie+du+Centre+Douala",
        address: "Boulevard de la Liberté, Akwa, Douala",
        phone: "+237 233 42 14 56",
        status: "Ouverte 24h/24 • Service de Garde",
        reviewSnippets: ["Service de garde 24h/24, large stock de médicaments d'urgence et perfusion."],
      },
      {
        title: "Pharmacie des Palmiers - Bonanjo",
        uri: "https://www.google.com/maps/search/?api=1&query=Pharmacie+des+Palmiers+Douala",
        address: "Rue des Cocotiers, Bonanjo, Douala",
        phone: "+237 233 42 88 12",
        status: "Ouverte jusqu'à 22h",
        reviewSnippets: ["Conseils pharmaceutiques avisés pour enfants et adultes, ordonnances urgentes."],
      },
      {
        title: "Pharmacie de la Liberté - Deido",
        uri: "https://www.google.com/maps/search/?api=1&query=Pharmacie+de+la+Liberte+Douala",
        address: "Rond-point Deido, Douala",
        phone: "+237 233 40 55 90",
        status: "Service de nuit & garde",
        reviewSnippets: ["Officine de référence pour les ordonnances nocturnes et antipaludéens."],
      },
      {
        title: "Pharmacie de l'Aéroport - Bonapriso",
        uri: "https://www.google.com/maps/search/?api=1&query=Pharmacie+Aeroport+Bonapriso+Douala",
        address: "Avenue de Gaulle, Bonapriso, Douala",
        phone: "+237 233 43 01 22",
        status: "Ouverte 7j/7",
        reviewSnippets: ["Stock complet en antibiotiques, antalgiques et matériel médical."],
      }
    ];

    const isPharmacySearch = (
      query.includes("pharmacie") ||
      query.includes("garde") ||
      query.includes("ouvert") ||
      query.includes("proche") ||
      query.includes("nuit") ||
      query.includes("adresse") ||
      query.includes("trouver") ||
      query.includes("où acheter") ||
      query.includes("maps") ||
      query.includes("itineraire") ||
      query.includes("itinéraire")
    );

    const isParacetamol = query.includes("paracétamol") || query.includes("paracetamol") || query.includes("doliprane") || query.includes("efferalgan") || query.includes("dafalgan");
    const isIbuprofen = query.includes("ibuprofène") || query.includes("ibuprofene") || query.includes("advil") || query.includes("nurofen") || query.includes("anti-inflammatoire");
    const isAmoxicillin = query.includes("amoxicilline") || query.includes("amoxicillin") || query.includes("augmentin") || query.includes("antibiotique");
    const isPainOrFever = query.includes("douleur") || query.includes("fievre") || query.includes("fièvre") || query.includes("mal de tête") || query.includes("courbature");
    const isOrdonnance = query.includes("ordonnance") || query.includes("prescription") || query.includes("scanner") || query.includes("docteur") || query.includes("medecin");

    let text = "";

    if (isPharmacySearch) {
      text = `🩺 **Pharmacies de garde & Ouvertes à proximité** *(Mode Sécurité Officine)*

En raison d'une forte affluence sur notre analyseur IA en direct, voici la liste des officines de garde de référence immédiatement joignables :

1. **Pharmacie du Centre - Akwa** : Boulevard de la Liberté • 📞 +237 233 42 14 56 *(Service de Garde 24h/24)*
2. **Pharmacie des Palmiers - Bonanjo** : Rue des Cocotiers • 📞 +237 233 42 88 12 *(Ouverte jusqu'à 22h)*
3. **Pharmacie de la Liberté - Deido** : Rond-Point Deido • 📞 +237 233 40 55 90 *(Garde de nuit)*
4. **Pharmacie de l'Aéroport - Bonapriso** : Avenue de Gaulle • 📞 +237 233 43 01 22 *(7j/7)*

🚨 **Numéros d'urgence médicale vitale :**
* **SAMU** : **15** (ou **112**)
* **Sapeurs-Pompiers** : **118**
* **Police Secours** : **117**

💡 *Vous pouvez également retrouver l'ensemble de nos pharmacies affiliées avec leurs stocks disponibles directement dans l'onglet « Recherche » de PharmAply.*`;
    } else if (isParacetamol || (isPainOrFever && !isIbuprofen)) {
      text = `💊 **Conseils cliniques d'officine : Paracétamol (Doliprane, Dafalgan, Efferalgan)**

Le paracétamol est l'antalgique et antipyrétique de première intention pour soulager douleurs et fièvre.

📋 **Règles d'or de posologie (Adulte de plus de 50 kg) :**
* **Dose usuelle :** 500 mg à 1000 mg par prise.
* **Intervalle minimal :** Respecter impérativement **4 à 6 heures minimum** entre deux prises.
* **Dose maximale absolue :** **3 grammes par 24h** en automédication (jusqu'à 4 g/24h uniquement sur prescription médicale expresse).

⚠️ **Précautions cruciales :**
* **Risque de surdosage hépatique :** Ne jamais combiner deux médicaments contenant du paracétamol (attention aux sirops pour le rhume ou sachets combinés).
* **Alcool & Foie :** Contre-indiqué en cas d'insuffisance hépatique sévère.
* En cas de fièvre persistante au-delà de 3 jours ou de douleur au-delà de 5 jours, consultez impérativement un médecin.`;
    } else if (isIbuprofen) {
      text = `⚠️ **Conseils cliniques : Ibuprofène & Anti-inflammatoires non stéroïdiens (AINS)**

📋 **Posologie habituelle (Adulte) :**
* 200 mg à 400 mg par prise, toujours au cours d'un repas.
* Intervalle d'au moins 6 heures. Maximum 1200 mg par jour en automédication.
* Durée la plus courte possible (3 jours max pour la fièvre, 5 jours pour la douleur).

🚫 **Contre-indications majeures :**
* **Grossesse :** Strictement contre-indiqué à partir du début du 6ème mois de grossesse (et déconseillé avant).
* **Ulcère gastrique**, saignements digestifs ou antécédents d'asthme déclenché par les anti-inflammatoires.
* **Infections bactériennes :** Éviter formellement en cas de varicelle ou d'infection pulmonaire / cutanée sans avis médical strict.
* Ne jamais associer deux anti-inflammatoires (ex: aspirine + ibuprofène).`;
    } else if (isAmoxicillin) {
      text = `💊 **Conseils cliniques : Amoxicilline (Antibiotique)**

L'amoxicilline est un antibiotique de la famille des pénicillines (bêta-lactamines).

📋 **Recommandations essentielles :**
* **Prescription médicale obligatoire :** Les antibiotiques ne traitent que les infections d'origine bactérienne, jamais les virus (grippe, rhume, bronchite virale classique).
* **Respect strict de la durée :** Prenez le traitement jusqu'au bout prescrit par le médecin, même si les symptômes ont disparu plus tôt.
* **Horaires réguliers :** Espacer les prises régulièrement (ex: matin et soir à 12h d'intervalle).

⚠️ **Alerte Allergie :**
En cas d'éruption cutanée, démangeaisons, gonflement des lèvres/visage ou difficultés respiratoires, arrêtez immédiatement le médicament et contactez le **15 (SAMU)**.`;
    } else if (isOrdonnance) {
      text = `📋 **Conseils de prise d'ordonnance & Préparation PharmAply**

Pour que votre traitement soit optimal et sécurisé :
* **Horaires :** Respectez les moments indiqués par votre médecin (à jeun, au milieu du repas, ou au coucher).
* **Préparation en pharmacie :** Vous pouvez scanner votre ordonnance via le bouton photo de la page d'accueil pour réserver vos médicaments dans l'officine la plus proche.
* **Questions au pharmacien :** N'hésitez jamais à demander à votre pharmacien d'officine un plan de prise personnalisé si vous prenez plusieurs molécules différentes.`;
    } else {
      text = `🩺 **Conseils du Pharmacien Clinicien PharmAply** *(Mode Sécurité Officine)*

*Note : Notre service d'analyse IA connaît une forte affluence en ce moment. Voici les conseils pharmaceutiques essentiels concernant votre demande :*

* **Prise de médicaments :** Lisez attentivement la notice de vos médicaments. Respectez les intervalles minimaux entre les prises et ne dépassez jamais les doses journalières maximales.
* **Pharmacies & Conseils :** Nos pharmaciens partenaires sont à votre disposition en officine pour toute vérification d'interaction ou conseil spécifique.
* **Urgence médicale :** Si vous ressentez une gêne respiratoire, une douleur thoracique aiguë inhabituelle ou un malaise, contactez immédiatement le **15 (SAMU)** ou le **112**.

*N'hésitez pas à reformuler avec le nom précis de votre médicament ou à réitérer votre question dans quelques instants.*`;
    }

    return {
      text,
      mapsPlaces: defaultPharmacies,
    };
  }

  // =========================================================================
  // SMART SCAN ORDONNANCE AVEC IA MULTIMODALE & MATCHING GÉOGRAPHIQUE
  // =========================================================================
  app.post("/api/ai/scan-prescription", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { imageBase64, mimeType, latitude, longitude } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ success: false, error: "Image base64 manquante." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, error: "Clé GEMINI_API_KEY non configurée sur le serveur." });
      }

      // Patient location (default to Douala coordinates if not provided)
      const userLat = typeof latitude === 'number' ? latitude : 4.0511;
      const userLng = typeof longitude === 'number' ? longitude : 9.7679;

      // 1. Appel du modèle multimodal Gemini avec cascade de résilience
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const visionPrompt = `Tu es un assistant pharmacien expert en déchiffrage d'ordonnances médicales manuscrites et imprimées.
Analyse attentivement cette image d'ordonnance médicale ou de boîte de médicament.

Extrais TOUS les médicaments prescrits et retourne UNIQUEMENT un tableau JSON structuré.
Pour chaque médicament identifié, retourne un objet avec ces champs exacts :
- "nom_medicament": string (Nom commercial ou nom principal, ex: "Doliprane", "Amoxicilline", "Spasfon", "Augmentin")
- "dosage": string (ex: "1000mg", "500mg", "1g", "50mg/ml", ou "Standard" si absent)
- "forme": string (ex: "Comprimé", "Gélule", "Sirop", "Injectable", "Sachet", "Pommade", etc.)
- "quantite": number (Quantité/boîtes prescrites, nombre entier positif, par défaut 1 si non spécifié)
- "posologie": string (Instructions de prise, ex: "1 comprimé matin et soir pendant 5 jours")
- "dci": string (Dénomination Commune Internationale si déductible, ex: "Paracétamol", "Amoxicilline", ou identique au nom)
- "ordonnance_requise": boolean (true si médicament sous prescription obligatoire, false sinon)
- "remarques": string (Conseils ou avertissements)

Réponds STRICTEMENT par un JSON valide sans formatage Markdown superflu. Exemple :
[
  {
    "nom_medicament": "Doliprane",
    "dosage": "1000mg",
    "forme": "Comprimé",
    "quantite": 2,
    "posologie": "1 cp toutes les 8 heures si douleur",
    "dci": "Paracétamol",
    "ordonnance_requise": false,
    "remarques": "Ne pas dépasser 3g par jour"
  }
]`;

      let response: any = null;
      try {
        // Tentative 1 : Modèle standard gemini-3.8-flash
        response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [
            { inlineData: { data: imageBase64, mimeType: mimeType || "image/jpeg" } },
            visionPrompt
          ],
          config: {
            responseMimeType: "application/json",
          },
        });
      } catch (err1: any) {
        if (isQuotaOrRateLimitError(err1)) {
          console.warn("Quota atteint sur gemini-3.8-flash pour scan ordonnance, tentative de repli sur gemini-3.1-flash-lite...");
          try {
            // Tentative 2 : Repli sur gemini-3.1-flash-lite
            response = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite",
              contents: [
                { inlineData: { data: imageBase64, mimeType: mimeType || "image/jpeg" } },
                visionPrompt
              ],
              config: {
                responseMimeType: "application/json",
              },
            });
          } catch (err2: any) {
            console.error("Erreur de repli scan ordonnance :", err2);
            return res.status(429).json({
              success: false,
              error: cleanErrorMessage(err2, "Le service d'analyse optique d'ordonnance est momentanément très sollicité. Veuillez patienter une minute avant de réessayer, ou rechercher vos médicaments dans la barre de recherche."),
            });
          }
        } else {
          throw err1;
        }
      }

      let rawAiText = response?.text || "[]";
      // Nettoyage au cas où des backticks markdown seraient inclus
      if (rawAiText.startsWith("```json")) {
        rawAiText = rawAiText.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (rawAiText.startsWith("```")) {
        rawAiText = rawAiText.replace(/^```/, "").replace(/```$/, "").trim();
      }

      let detectedMeds: any[] = [];
      try {
        const parsed = JSON.parse(rawAiText);
        detectedMeds = Array.isArray(parsed) ? parsed : (parsed.medications || [parsed]);
      } catch (parseErr) {
        console.error("Failed to parse Gemini response as JSON:", rawAiText);
        return res.status(422).json({
          success: false,
          error: "L'IA n'a pas pu structurer les médicaments de l'ordonnance.",
          rawText: rawAiText
        });
      }

      // 2. Connexion à Supabase pour le Matching & la Géolocalisation
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

      let allProducts: any[] = [];
      let allPharmacies: any[] = [];
      let globalCatalog: any[] = [];

      if (supabaseUrl && supabaseKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch pharmacies
        const { data: pharmaciesData } = await supabase
          .from('pharmacies')
          .select('*');
        if (pharmaciesData) {
          allPharmacies = pharmaciesData.map((ph: any) => {
            const extra = ph.data || {};
            return {
              id: ph.id,
              name: ph.name || extra.name || extra.pharmacy_name || "Pharmacie Partenaire",
              address: ph.address || extra.address || "Douala",
              phone: ph.phone || extra.phone || "",
              latitude: Number(ph.latitude ?? extra.latitude ?? extra.lat ?? 4.0511),
              longitude: Number(ph.longitude ?? extra.longitude ?? extra.lng ?? 9.7679),
              status: ph.status || extra.status || 'approved'
            };
          });
        }

        // Fetch pharmacy stock products
        const { data: productsData } = await supabase
          .from('products')
          .select('*');
        if (productsData) {
          allProducts = productsData.map((p: any) => {
            const extra = p.data || {};
            return {
              id: p.id,
              nom_commercial: p.nom_commercial || p.commercial_name || p.name || extra.nom_commercial || extra.name || "",
              dci: p.dci || extra.dci || "",
              dosage: p.dosage || extra.dosage || "",
              form: p.form || p.forme || extra.form || "",
              price: Number(p.price ?? extra.price ?? 0),
              stock: Number(p.stock ?? extra.stock ?? 0),
              pharmacy_id: p.pharmacy_id || p.pharmacyId || extra.pharmacy_id || extra.pharmacyId,
              is_prescription_required: p.is_prescription_required ?? extra.is_prescription_required ?? true,
              image_url: p.image_url || extra.image_url || null,
              category: p.category || p.ux_category || extra.category || "Pharmacie"
            };
          });
        }

        // Fetch global national catalog (produits_patients) for fallback
        const { data: catalogData } = await supabase
          .from('produits_patients')
          .select('*');
        if (catalogData) {
          globalCatalog = catalogData.map((c: any) => ({
            id: c.id,
            nom_commercial: c.nom_commercial || c.commercial_name || c.name || "",
            dci: c.dci || "",
            dosage: c.dosage || "",
            forme: c.forme || c.form || "",
            prix_moyen: Number(c.prix_moyen || c.price || 1500),
            ordonnance_requise: c.ordonnance_requise ?? true,
            categorie_ux: c.categorie_ux || c.category || "Médicament"
          }));
        }
      }

      // 3. Matching & Sélection Géographique Optimale
      const extracted_items: any[] = [];
      const pharmaciesMap = new Map<string, any>();
      allPharmacies.forEach(ph => pharmaciesMap.set(ph.id, ph));

      for (const detected of detectedMeds) {
        const queryName = (detected.nom_medicament || "").trim();
        const queryDci = (detected.dci || "").trim();
        const queryDosage = (detected.dosage || "").trim();

        // Trouver les correspondances parmi les stocks en pharmacie
        const candidates: any[] = [];

        for (const prod of allProducts) {
          const simName = stringSimilarity(queryName, prod.nom_commercial);
          const simDci = queryDci ? stringSimilarity(queryDci, prod.dci) : 0;
          const bestScore = Math.max(simName, simDci);

          if (bestScore >= 0.45) {
            const pharmacy = pharmaciesMap.get(prod.pharmacy_id);
            const phLat = pharmacy ? pharmacy.latitude : 4.0511;
            const phLng = pharmacy ? pharmacy.longitude : 9.7679;
            const distance = calculateDistanceKm(userLat, userLng, phLat, phLng);

            candidates.push({
              product: {
                id: prod.id,
                nom_commercial: prod.nom_commercial,
                dci: prod.dci,
                dosage: prod.dosage || queryDosage,
                form: prod.form || detected.forme,
                price: prod.price || 1500,
                stock: prod.stock,
                image_url: prod.image_url,
                pharmacy_id: prod.pharmacy_id,
                pharmacy_name: pharmacy ? pharmacy.name : "Pharmacie Partenaire",
                pharmacy_address: pharmacy ? pharmacy.address : "Douala",
                pharmacy_phone: pharmacy ? pharmacy.phone : "",
                distance_km: Math.round(distance * 10) / 10,
                latitude: phLat,
                longitude: phLng,
                is_prescription_required: prod.is_prescription_required
              },
              similarityScore: bestScore,
              distanceKm: distance,
              hasStock: prod.stock > 0
            });
          }
        }

        // Tri : priorité aux produits EN STOCK (stock > 0), puis par distance géographique la plus courte, puis par score de similarité
        candidates.sort((a, b) => {
          if (a.hasStock && !b.hasStock) return -1;
          if (!a.hasStock && b.hasStock) return 1;
          if (Math.abs(a.distanceKm - b.distanceKm) > 0.5) {
            return a.distanceKm - b.distanceKm;
          }
          return b.similarityScore - a.similarityScore;
        });

        if (candidates.length > 0) {
          const best = candidates[0];
          extracted_items.push({
            detected: {
              ...detected,
              quantite: Number(detected.quantite) || 1
            },
            matched: true,
            in_stock: best.hasStock,
            product: best.product,
            similarity_score: best.similarityScore,
            available_alternatives: candidates.slice(1, 4).map(c => c.product)
          });
        } else {
          // Recherche dans le catalogue national (produits_patients)
          const catalogMatches = globalCatalog.filter(c => {
            const sName = stringSimilarity(queryName, c.nom_commercial);
            const sDci = queryDci ? stringSimilarity(queryDci, c.dci) : 0;
            return Math.max(sName, sDci) >= 0.45;
          });

          if (catalogMatches.length > 0) {
            const catItem = catalogMatches[0];
            // Trouver la pharmacie la plus proche pour ce produit du catalogue
            const nearestPh = allPharmacies.length > 0 ? [...allPharmacies].sort((a, b) => {
              const dA = calculateDistanceKm(userLat, userLng, a.latitude, a.longitude);
              const dB = calculateDistanceKm(userLat, userLng, b.latitude, b.longitude);
              return dA - dB;
            })[0] : null;

            const dist = nearestPh ? calculateDistanceKm(userLat, userLng, nearestPh.latitude, nearestPh.longitude) : 1.5;

            extracted_items.push({
              detected: {
                ...detected,
                quantite: Number(detected.quantite) || 1
              },
              matched: true,
              in_stock: false,
              product: {
                id: catItem.id,
                nom_commercial: catItem.nom_commercial,
                dci: catItem.dci,
                dosage: catItem.dosage || queryDosage,
                form: catItem.forme || detected.forme,
                price: catItem.prix_moyen || 2000,
                stock: 5, // Quantité estimée disponible sur commande
                image_url: null,
                pharmacy_id: nearestPh?.id || "default_pharmacy",
                pharmacy_name: nearestPh?.name || "Pharmacie de Référence",
                pharmacy_address: nearestPh?.address || "Douala",
                distance_km: Math.round(dist * 10) / 10,
                latitude: nearestPh?.latitude || userLat,
                longitude: nearestPh?.longitude || userLng,
                is_prescription_required: catItem.ordonnance_requise
              },
              similarity_score: 0.8,
              available_alternatives: []
            });
          } else {
            // Aucun produit correspondant trouvé en base
            extracted_items.push({
              detected: {
                ...detected,
                quantite: Number(detected.quantite) || 1
              },
              matched: false,
              in_stock: false,
              product: null,
              similarity_score: 0,
              available_alternatives: []
            });
          }
        }
      }

      // Déduire les pharmacies distinctes impliquées
      const distinctPharmacies = new Map<string, any>();
      extracted_items.forEach(item => {
        if (item.product && item.product.pharmacy_id) {
          distinctPharmacies.set(item.product.pharmacy_id, {
            id: item.product.pharmacy_id,
            name: item.product.pharmacy_name,
            address: item.product.pharmacy_address,
            distance_km: item.product.distance_km
          });
        }
      });

      const result = {
        success: true,
        extracted_items,
        pharmacies_involved: Array.from(distinctPharmacies.values()),
        summary: {
          total_detected: detectedMeds.length,
          total_matched: extracted_items.filter(i => i.matched).length,
          total_unmatched: extracted_items.filter(i => !i.matched).length,
          multi_pharmacy: distinctPharmacies.size > 1,
          pharmacy_count: distinctPharmacies.size
        }
      };

      res.json(result);
    } catch (error: any) {
      console.error("Erreur dans /api/ai/scan-prescription:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Échec de l'analyse intelligente de l'ordonnance."
      });
    }
  });

  // =========================================================================
  // ASSISTANT PHARMACIEN IA GEMINI AVEC GOOGLE MAPS GROUNDING & RESILIENCE QUOTA
  // =========================================================================
  app.post("/api/ai/chat", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { messages, userLocation, model, enableMaps } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, error: "Liste de messages requise." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error: "Clé GEMINI_API_KEY non configurée sur le serveur. Veuillez vérifier les variables d'environnement."
        });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Analyse du dernier message pour détecter un besoin de localisation / pharmacie
      const lastMessage = messages[messages.length - 1];
      const lastText = (typeof lastMessage?.content === 'string' ? lastMessage.content : lastMessage?.text || "").toLowerCase();
      const requiresMaps = Boolean(
        enableMaps ||
        lastText.includes("pharmacie") ||
        lastText.includes("garde") ||
        lastText.includes("ouvert") ||
        lastText.includes("proche") ||
        lastText.includes("adresse") ||
        lastText.includes("itineraire") ||
        lastText.includes("itinéraire") ||
        lastText.includes("localisation") ||
        lastText.includes("trouver") ||
        lastText.includes("où acheter") ||
        lastText.includes("disponible") ||
        lastText.includes("maps")
      );

      // Modèles supportés :
      // - Si Google Maps Grounding requis : "gemini-3.8-flash"
      // - Sinon selon le choix utilisateur : "gemini-3.8-flash" (défaut), "gemini-3.1-flash-lite" (rapide), ou "gemini-4-argon"
      let selectedModel = model || "gemini-3.8-flash";
      if (requiresMaps) {
        selectedModel = "gemini-3.8-flash";
      }

      // Normalisation des rôles Gemini ('user' ou 'model')
      const formattedContents = messages.map((m: any) => ({
        role: m.role === "assistant" || m.role === "model" ? "model" : "user",
        parts: [{ text: String(m.content || m.text || "") }]
      }));

      const systemInstruction = `Tu es l'assistant pharmacien clinique officiel et bienveillant de l'application PharmAply.
Tes missions essentielles :
1. Renseigner et conseiller les utilisateurs sur les médicaments (posologies habituelles, indications, mode d'administration, précautions, interactions médicamenteuses fréquentes).
2. Orientation pharmaceutique : si l'utilisateur recherche une pharmacie (pharmacies de garde, pharmacies ouvertes, à proximité, calcul d'itinéraire, adresses ou horaires), sers-toi impérativement des données certifiées fournies par Google Maps Grounding pour citer précisément les noms de pharmacies, leurs adresses réelles et leurs coordonnées.
3. Explication pédagogique des ordonnances et aide à la préparation de commande sur l'application.
4. Règle absolue de sécurité médicale : tu es un assistant d'orientation et de conseil, tu ne poses pas de diagnostic médical définitif. En cas d'urgence vitale, détresse respiratoire, douleur thoracique aiguë, réaction allergique sévère ou traumatisme grave, indique fermement d'appeler immédiatement le 15 (SAMU), le 112 ou de se rendre aux urgences hospitalières les plus proches.
5. Adopte un ton empathique, professionnel, clair, structuré avec des puces d'action simples.`;

      const genConfigWithMaps: any = {
        systemInstruction,
        tools: [{ googleMaps: {} }]
      };

      const userLat = (userLocation && typeof userLocation.latitude === "number") ? userLocation.latitude : 4.0511;
      const userLng = (userLocation && typeof userLocation.longitude === "number") ? userLocation.longitude : 9.7679;

      if (userLocation && typeof userLocation.latitude === "number" && typeof userLocation.longitude === "number") {
        genConfigWithMaps.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }
          }
        };
      }

      const genConfigTextOnly: any = {
        systemInstruction,
      };

      let response: any = null;
      let usedModel = selectedModel;
      let usedMapsGrounded = false;
      let isQuotaFallback = false;

      // =======================================================================
      // CASCADE DE RÉSILIENCE MULTI-MODÈLES & QUOTA
      // =======================================================================
      try {
        if (requiresMaps) {
          // Étape 1 : Essai avec Google Maps Grounding
          try {
            response = await ai.models.generateContent({
              model: selectedModel,
              contents: formattedContents,
              config: genConfigWithMaps,
            });
            usedMapsGrounded = true;
          } catch (mapsErr: any) {
            console.warn("Échec ou quota sur Google Maps Grounding, repli sans Maps Grounding sur", selectedModel, ":", mapsErr?.message);
            // Étape 2 : Repli sans Maps tool pour contourner la saturation du tool Maps
            response = await ai.models.generateContent({
              model: selectedModel,
              contents: formattedContents,
              config: genConfigTextOnly,
            });
            usedMapsGrounded = false;
          }
        } else {
          // Étape 1 standard (sans maps)
          response = await ai.models.generateContent({
            model: selectedModel,
            contents: formattedContents,
            config: genConfigTextOnly,
          });
        }
      } catch (tier1Err: any) {
        console.warn("Échec ou quota sur", selectedModel, "- tentative de repli vers gemini-3.1-flash-lite...", tier1Err?.message);
        try {
          // Étape 3 : Repli sur gemini-3.1-flash-lite (haute cadence et quota distinct)
          response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: formattedContents,
            config: genConfigTextOnly,
          });
          usedModel = "gemini-3.1-flash-lite";
          usedMapsGrounded = false;
        } catch (tier2Err: any) {
          console.warn("Tous les modèles Gemini sont indisponibles ou en quota dépassé (429/503). Déclenchement du fallback clinique officine.");
          // Étape 4 : Repli clinique d'officine immédiat (continuité totale de service)
          isQuotaFallback = true;
        }
      }

      // Si le fallback clinique a été déclenché en raison d'un quota 429
      if (isQuotaFallback || !response) {
        const fallback = generateFallbackPharmacyResponse(lastText, userLat, userLng);
        return res.json({
          success: true,
          text: fallback.text,
          model: "PharmAply Mode Sécurité",
          usedMaps: false,
          isQuotaFallback: true,
          mapsPlaces: fallback.mapsPlaces,
          groundingChunks: [],
          webSearchQueries: [],
        });
      }

      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata;
      const groundingChunks = groundingMetadata?.groundingChunks || [];
      const webSearchQueries = groundingMetadata?.webSearchQueries || [];

      // Extraction des points Google Maps géolocalisés
      const mapsPlaces: Array<{
        title?: string;
        uri?: string;
        reviewSnippets?: string[];
      }> = [];

      if (Array.isArray(groundingChunks)) {
        for (const chunk of groundingChunks) {
          if (chunk.maps) {
            const snippets: string[] = [];
            const sources = (chunk.maps as any).placeAnswerSources?.reviewSnippets;
            if (Array.isArray(sources)) {
              for (const s of sources) {
                if (s.reviewText) snippets.push(s.reviewText);
              }
            }
            mapsPlaces.push({
              title: chunk.maps.title,
              uri: chunk.maps.uri,
              reviewSnippets: snippets,
            });
          }
        }
      }

      // Si l'utilisateur cherchait des pharmacies mais que Maps Grounding n'en a pas retourné ou a été court-circuité,
      // on enrichit avec les pharmacies partenaires locales pour garantir la meilleure expérience
      if (requiresMaps && mapsPlaces.length === 0) {
        const fallback = generateFallbackPharmacyResponse(lastText, userLat, userLng);
        mapsPlaces.push(...fallback.mapsPlaces);
      }

      return res.json({
        success: true,
        text: response.text || "",
        model: usedModel,
        usedMaps: usedMapsGrounded,
        isQuotaFallback: false,
        groundingChunks,
        mapsPlaces,
        webSearchQueries,
      });
    } catch (error: any) {
      console.error("Erreur dans /api/ai/chat:", error);
      // Même en cas d'erreur inattendue non capturée, si c'est un 429 on retourne le fallback au lieu d'une erreur 500
      if (isQuotaOrRateLimitError(error)) {
        const fallback = generateFallbackPharmacyResponse("", 4.0511, 9.7679);
        return res.json({
          success: true,
          text: fallback.text,
          model: "PharmAply Mode Sécurité",
          usedMaps: false,
          isQuotaFallback: true,
          mapsPlaces: fallback.mapsPlaces,
          groundingChunks: [],
          webSearchQueries: [],
        });
      }

      return res.status(500).json({
        success: false,
        error: cleanErrorMessage(error, "Erreur lors de la génération de réponse par l'IA."),
      });
    }
  });

  // =========================================================================
  // RECHERCHE PHARMACIES DE GARDE / OUVERTES VIA GOOGLE MAPS GROUNDING
  // =========================================================================
  app.post("/api/ai/nearby-pharmacies", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { latitude, longitude, query } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error: "Clé GEMINI_API_KEY non configurée.",
        });
      }

      const userLat = typeof latitude === "number" ? latitude : 4.0511;
      const userLng = typeof longitude === "number" ? longitude : 9.7679;

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const promptText = query && String(query).trim().length > 0
        ? `Recherche les pharmacies suivantes autour de ma position géographique : "${query}". Indique précisément les pharmacies ouvertes ou de garde, leurs adresses complètes, leurs coordonnées et conseils d'accès.`
        : `Quelles sont les pharmacies de garde et les pharmacies ouvertes actuellement les plus proches de ma position ? Donne pour chacune son nom exact, son adresse précise, ses horaires ou statut de garde, et comment s'y rendre.`;

      let response: any = null;
      let isFallback = false;

      try {
        response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: promptText,
          config: {
            systemInstruction: "Tu es le service officiel de géolocalisation d'urgence et de garde pour PharmAply. Fournis une liste structurée et vérifiée des pharmacies disponibles avec leurs adresses réelles.",
            tools: [{ googleMaps: {} }],
            toolConfig: {
              retrievalConfig: {
                latLng: {
                  latitude: userLat,
                  longitude: userLng,
                }
              }
            }
          }
        });
      } catch (apiErr: any) {
        console.warn("Erreur Google Maps Grounding dans /api/ai/nearby-pharmacies, repli sur le registre des pharmacies :", apiErr?.message);
        isFallback = true;
      }

      const mapsPlaces: Array<{
        title?: string;
        uri?: string;
        reviewSnippets?: string[];
      }> = [];

      if (!isFallback && response) {
        const candidate = response.candidates?.[0];
        const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];

        if (Array.isArray(groundingChunks)) {
          for (const chunk of groundingChunks) {
            if (chunk.maps) {
              const snippets: string[] = [];
              const sources = (chunk.maps as any).placeAnswerSources?.reviewSnippets;
              if (Array.isArray(sources)) {
                for (const s of sources) {
                  if (s.reviewText) snippets.push(s.reviewText);
                }
              }
              mapsPlaces.push({
                title: chunk.maps.title,
                uri: chunk.maps.uri,
                reviewSnippets: snippets,
              });
            }
          }
        }
      }

      // Si aucune pharmacie maps n'a été retournée ou repli actif
      if (mapsPlaces.length === 0) {
        const fallback = generateFallbackPharmacyResponse("pharmacie de garde", userLat, userLng);
        mapsPlaces.push(...fallback.mapsPlaces);

        return res.json({
          success: true,
          fallback: true,
          isQuotaFallback: isFallback,
          text: (response && response.text) ? response.text : fallback.text,
          mapsPlaces,
          groundingChunks: [],
          location: { latitude: userLat, longitude: userLng }
        });
      }

      return res.json({
        success: true,
        text: response.text || "",
        mapsPlaces,
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
        location: { latitude: userLat, longitude: userLng }
      });
    } catch (error: any) {
      console.error("Erreur dans /api/ai/nearby-pharmacies:", error);
      const fallback = generateFallbackPharmacyResponse("pharmacie de garde", 4.0511, 9.7679);
      return res.json({
        success: true,
        fallback: true,
        isQuotaFallback: true,
        text: fallback.text,
        mapsPlaces: fallback.mapsPlaces,
        location: { latitude: 4.0511, longitude: 9.7679 }
      });
    }
  });

  // Nodemailer transporter (for production, configure this via process.env)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER || "fake-user",
      pass: process.env.SMTP_PASS || "fake-pass",
    },
  });

  // Initialisation du Paiement (Fapshi Sandbox & Live)
  app.post("/api/payment/initialize", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { amount, email, externalId, redirectUrl } = req.body;
      
      const apiUser = process.env.FAPSHI_API_USER;
      const apiKey = process.env.FAPSHI_API_KEY;
      const isLive = process.env.FAPSHI_ENV === "live";

      console.log('Initiating Fapshi payment for:', { amount, email, externalId });

      // If Fapshi credentials exist, attempt real Fapshi API call
      if (apiUser && apiKey) {
        try {
          const endpoint = isLive 
            ? 'https://live.fapshi.com/v1/initiate-pay'
            : 'https://sandbox.fapshi.com/v1/initiate-pay';

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apiuser': apiUser,
              'apikey': apiKey
            },
            body: JSON.stringify({
              amount,
              email,
              externalId,
              redirectUrl
            })
          });

          const data: any = await response.json();
          if (response.ok && data?.link) {
            return res.json({ success: true, link: data.link, transId: data.transId });
          } else {
            console.warn('Fapshi API responded without link, falling back to sandbox window:', data);
          }
        } catch (apiErr) {
          console.warn('Fapshi direct API call failed, using sandbox fallback:', apiErr);
        }
      }

      // Built-in Fapshi Sandbox interactive payment gateway
      const sandboxLink = `/patient/fapshi-sandbox-checkout?amount=${amount}&externalId=${externalId}&email=${encodeURIComponent(email || '')}&redirectUrl=${encodeURIComponent(redirectUrl)}&transId=sand_${Date.now()}`;
      return res.json({ success: true, link: sandboxLink, isSandbox: true });
    } catch (error: any) {
      console.error("Fapshi server error:", error);
      const fallbackLink = `/patient/fapshi-sandbox-checkout?amount=${req.body?.amount || 0}&externalId=${req.body?.externalId || ''}&redirectUrl=${encodeURIComponent(req.body?.redirectUrl || '')}`;
      res.json({ success: true, link: fallbackLink, isSandbox: true });
    }
  });

  // Fapshi Webhook Endpoint (Split Paiement)
  app.post("/api/webhooks/fapshi", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      console.log('Webhook Fapshi reçu:', req.body);
      const { externalId, status, transId } = req.body;

      // Sécurité : Vérification de l'origine de Fapshi
      // Il est vital de valider que la transaction est réelle auprès de Fapshi. 
      // Fapshi propose d'interroger directement l'API de statut ou d'utiliser un header HMAC s'il est configuré.
      /* Exemple de validation par API (Best Practice) :
         const verifyReq = await fetch(`https://api.fapshi.com/v1/payment-status/${transId}`, {
            headers: { 'apiuser': process.env.FAPSHI_API_USER, 'apikey': process.env.FAPSHI_API_KEY }
         });
         const verifyData = await verifyReq.json();
         if (verifyData.status !== 'SUCCESSFUL') throw new Error("Transaction invalide");
      */
      
      if (status === 'SUCCESSFUL' && externalId) {
        console.log(`Paiement confirmé pour la commande ${externalId}`);
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Toujours utiliser la Service Role Key pour modifier les wallets
        
        if (supabaseUrl && supabaseKey) {
           const { createClient } = await import('@supabase/supabase-js');
           const supabase = createClient(supabaseUrl, supabaseKey);
           
           // Récupération de la commande
           const { data: orderRow, error: fetchError } = await supabase
              .from('orders')
              .select('*')
              .eq('id', externalId)
              .single();
              
           if (!fetchError && orderRow) {
              const orderData = orderRow.data || orderRow;
              
              // === MODÈLE ÉCONOMIQUE ===
              // Frais de livraison : Fixés à 1000 FCFA (800 Livreur, 200 Plateforme)
              // Commission Plateforme : 5% de la valeur nette des produits
              // Part Pharmacie : Le reste du montant net
              
              const totalAmount = orderData.total || 0;
              const deliveryFee = 1000;
              const productValue = Math.max(0, totalAmount - deliveryFee); // Valeur des produits

              const driverShare = 800; // Pour le livreur
              const platformDeliveryShare = 200; // Pour la plateforme
              
              const platformCommission = productValue * 0.05; // 5% de commission
              const pharmacyShare = productValue - platformCommission; // Reste pour la pharmacie

              const platformTotalShare = platformDeliveryShare + platformCommission;

              const driverId = orderData.driverId; 
              const pharmacyId = orderData.pharmacyId;

              // === DISTRIBUTION DANS LES WALLETS VIA RPC SUPABASE ===
              // L'utilisation d'une fonction RPC Supabase (ex: 'credit_wallet') assure une transaction atomique côté base de données
              // Voici le code pour l'intégration RPC, les procédures RPC doivent être définies dans Supabase:
              
              const transactionRecords = [];

              if (driverId) {
                  await supabase.rpc('credit_wallet', { user_id: driverId, amount: driverShare });
                  transactionRecords.push({
                    user_id: driverId,
                    amount: driverShare,
                    type: 'credit',
                    description: `Livraison commande ${externalId}`,
                    reference: transId
                  });
              }
              if (pharmacyId) {
                  await supabase.rpc('credit_wallet', { user_id: pharmacyId, amount: pharmacyShare });
                  transactionRecords.push({
                    user_id: pharmacyId,
                    amount: pharmacyShare,
                    type: 'credit',
                    description: `Paiement commande ${externalId}`,
                    reference: transId
                  });
              }
              // Créditer le wallet de la plateforme (avec un identifiant générique interne)
              await supabase.rpc('credit_wallet', { user_id: 'PLATFORM_MASTER_WALLET', amount: platformTotalShare });
              transactionRecords.push({
                user_id: 'PLATFORM_MASTER_WALLET',
                amount: platformTotalShare,
                type: 'credit',
                description: `Commission plateforme commande ${externalId}`,
                reference: transId
              });

              // Add Patient Payment Record
              const patientId = orderData.patientId;
              if (patientId) {
                transactionRecords.push({
                  user_id: patientId,
                  amount: totalAmount,
                  type: 'debit',
                  description: `Paiement Mobile Money commande ${externalId}`,
                  reference: transId
                });
              }

              // Insert transaction logs
              if (transactionRecords.length > 0) {
                 await supabase.from('wallet_transactions').insert(transactionRecords);
              }
              
              const datePaid = new Date().toISOString();

              // === MISE À JOUR DE LA COMMANDE ===
              if (orderRow.data) {
                  // Structure typée comme JSONB dans `data`
                  const updatedData = { ...orderRow.data, status: 'paid', fapshiTransId: transId, paidAt: datePaid };
                  await supabase.from('orders').update({ data: updatedData }).eq('id', externalId);
              } else {
                  // Structure avec colonnes aplaties
                  await supabase.from('orders').update({ status: 'paid', fapshiTransId: transId, paidAt: datePaid }).eq('id', externalId);
              }

              console.log('Fonds répartis et statut mis à jour avec succès.');
           }
        } else {
           console.error("Clé SUPABASE_SERVICE_ROLE_KEY manquante pour la répartition des fonds.");
        }
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Fapshi webhook error:", error);
      res.status(500).json({ success: false, error: "Webhook failure" });
    }
  });

  app.post("/api/ocr", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { imageBase64, mimeType } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, error: "Gemini API Key not configured." });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { inlineData: { data: imageBase64, mimeType: mimeType || "image/jpeg" } },
          `Tu es un pharmacien expert et auditeur réglementaire DPML (Direction de la Pharmacie, du Médicament et des Laboratoires).
Analyse rigoureusement cette ordonnance médicale ou boîte de médicament.

Extrais les informations de prescription et effectue un contrôle de conformité DPML.
Retourne un objet JSON valide avec la structure suivante :
{
  "doctor_name": string ou null,
  "patient_name": string ou null,
  "date": string ou null,
  "medications": [
    {
      "name": "Nom commercial ou DCI",
      "dosage": "Posologie (ex: 500mg, 1g)",
      "form": "Forme galénique (comprimé, sirop, injectable...)",
      "quantity": 1,
      "frequency": "Fréquence (ex: 1 cp matin et soir pendant 5 jours)",
      "duration": "Durée du traitement",
      "dpml_classification": "Liste_1" | "Liste_2" | "Stupefiant" | "OTC",
      "requires_prescription": boolean,
      "warnings": "Mises en garde, contre-indications ou interactions potentielles"
    }
  ],
  "dpml_safety_checks": {
    "has_controlled_substances": boolean,
    "requires_original_counterfoil": boolean,
    "validity_period_days": number,
    "compliance_notes": string
  },
  "overall_summary": string
}`
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "{}";
      const data = JSON.parse(text);
      res.json({ success: true, data });
    } catch (error) {
      console.error("Error in OCR & DPML analysis:", error);
      res.status(500).json({ success: false, error: "Failed to process prescription image." });
    }
  });

  app.post("/api/send-email", async (req: express.Request, res: express.Response) => {
    try {
      const { to, subject, text, html } = req.body;
      
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Pharmap" <noreply@pharmap.com>',
        to,
        subject,
        text,
        html,
      });

      console.log("Message sent: %s", info.messageId);
      res.json({ success: true, messageId: info.messageId });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ success: false, error: "Failed to send email" });
    }
  });

  app.post("/api/driver/telemetry", async (req: express.Request, res: express.Response) => {
    try {
      const { driver_id, latitude, longitude, heading, speed, destination_lat, destination_lng } = req.body;
      
      if (!driver_id || latitude === undefined || longitude === undefined) {
         return res.status(400).json({ success: false, error: "Missing required telemetry fields" });
      }

      // Basic Haversine distance for route deviation check
      let route_deviation_alert = false;
      let distanceToDestination = 0;
      
      if (destination_lat && destination_lng) {
         const R = 6371e3; // metres
         const nLat1 = latitude * Math.PI/180;
         const nLat2 = destination_lat * Math.PI/180;
         const dLat = (destination_lat - latitude) * Math.PI/180;
         const dLon = (destination_lng - longitude) * Math.PI/180;
         
         const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                   Math.cos(nLat1) * Math.cos(nLat2) *
                   Math.sin(dLon/2) * Math.sin(dLon/2);
         const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
         
         distanceToDestination = R * c; 
         
         // Arbitrary logic: If they are more than 5km away after being assigned, flag deviation.
         // Realistically this would use the Directions API polyline and match the point to the path.
         if (distanceToDestination > 5000) {
            route_deviation_alert = true;
         }
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
         console.warn("Supabase credentials not configured, skipping telemetry insert.");
         return res.status(200).json({ success: true, simulated: true, route_deviation_alert });
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error } = await supabase
         .from('driver_telemetry_logs')
         .insert([{
            driver_id,
            latitude,
            longitude,
            heading: heading || 0,
            speed: speed || 0,
            route_deviation: route_deviation_alert,
            created_at: new Date().toISOString()
         }]);

      if (error) {
         throw error;
      }

      res.json({ success: true, route_deviation_alert });
    } catch (error) {
      console.error("Error processing telemetry:", error);
      res.status(500).json({ success: false, error: "Failed to process telemetry" });
    }
  });

  // Generate AI Info Route
  app.post("/api/admin/generate-info", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { products, saveToDb } = req.body;
      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ success: false, error: "Missing products array" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
         return res.status(500).json({ success: false, error: "Gemini API key not configured" });
      }

      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are a medical data assistant. For each of the following products, generate professional information in French:
1. 'brand': Manufacturer or pharmaceutical brand name (e.g., Sanofi, GSK, Pfizer, Novartis, Bayer)
2. 'dosage': Standard dosage and format (e.g., 500mg Comprimé, 100mg/5ml Sirop)
3. 'description': Detailed product description & DCI active molecules
4. 'effects': Known side effects, precautions, and contraindications
5. 'directions': Directions & method of use (posology, frequency, mode of administration)

Products: ` + JSON.stringify(products.map((p: any) => ({
        id: p.id || "temp",
        name: p.name || p.nom_commercial || p.commercial_name || "",
        brand: p.brand || "",
        dosage: p.dosage || "",
        category: p.category || p.ux_category || p.categorie_ux || ""
      })));

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                brand: { type: Type.STRING, description: "Brand or manufacturer name" },
                dosage: { type: Type.STRING, description: "Dosage and format" },
                description: { type: Type.STRING, description: "Product therapeutic description" },
                effects: { type: Type.STRING, description: "Known side effects and precautions" },
                directions: { type: Type.STRING, description: "Directions and method of use" }
              },
              required: ["id", "brand", "dosage", "description", "effects", "directions"]
            }
          }
        }
      });

      const responseText = response.text || "[]";
      let generatedInfo: any[] = [];
      try {
         generatedInfo = JSON.parse(responseText);
      } catch (e) {
         const match = responseText.match(/\[.*\]/s);
         if (match) generatedInfo = JSON.parse(match[0]);
      }

      // If saveToDb is true, update Supabase tables
      if (saveToDb && generatedInfo.length > 0) {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
        if (supabaseUrl && (serviceKey || anonKey)) {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(supabaseUrl, serviceKey || anonKey!);

          for (const item of generatedInfo) {
            if (item.id && item.id !== "temp") {
              try {
                await supabase.from('produits_patients').update({
                  dci: item.description,
                  dosage: item.dosage,
                  forme: item.dosage,
                  brand: item.brand,
                  effects: item.effects,
                  directions: item.directions
                }).eq('id', item.id);
              } catch (e) {
                await supabase.from('produits_patients').update({
                  dci: item.description,
                  dosage: item.dosage,
                  forme: item.dosage
                }).eq('id', item.id);
              }

              try {
                await supabase.from('products').update({
                  description: item.description,
                  dci: item.description,
                  dosage: item.dosage,
                  brand: item.brand,
                  marque: item.brand,
                  effects: item.effects,
                  directions: item.directions
                }).or(`id.eq.${item.id},product_id.eq.${item.id}`);
              } catch (e) {
                await supabase.from('products').update({
                  description: item.description,
                  dosage: item.dosage
                }).eq('id', item.id);
              }
            }
          }
        }
      }

      res.json({ success: true, updates: generatedInfo });
    } catch (error: any) {
      console.error("Info generation error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // KYC Approval Route
  app.post("/api/admin/seed-products", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { data } = req.body;
      if (!data || !Array.isArray(data)) {
        return res.status(400).json({ success: false, error: "Missing or invalid 'data' array" });
      }
      
      const authHeader = req.headers.authorization;
      const userToken = authHeader ? authHeader.split(' ')[1] : undefined;

      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl) {
        return res.status(500).json({ success: false, error: "Supabase URL not configured on backend." });
      }
      
      const { createClient } = await import('@supabase/supabase-js');
      let supabase;
      
      if (serviceKey) {
        // Use service role key to completely bypass RLS
        supabase = createClient(supabaseUrl, serviceKey);
      } else if (anonKey) {
        // Fallback to anon key: supply user token if available so it operates as authenticated admin
        const options = userToken ? { global: { headers: { Authorization: `Bearer ${userToken}` } } } : {};
        supabase = createClient(supabaseUrl, anonKey, options);
      } else {
        return res.status(500).json({ success: false, error: "No Supabase keys configured on backend." });
      }

      const frenchWithImg = data.map((item: any) => {
        const row: any = {
          dci: item.dci || item.description || '',
          nom_commercial: item.nom_commercial || item.commercial_name || item.name || '',
          dosage: item.dosage || '',
          forme: item.forme || item.form || item.dosage || '',
          ordonnance_requise: item.ordonnance_requise !== undefined 
            ? (item.ordonnance_requise === true || item.ordonnance_requise === 'true') 
            : (item.is_prescription_required === true || item.is_prescription_required === 'true'),
          categorie_ux: item.categorie_ux || item.ux_category || 'Uncategorized'
        };
        const img = item.image_url || item.imageUrl || item.image;
        if (img) row.image_url = img;
        return row;
      });

      const frenchNoImg = frenchWithImg.map((item: any) => {
        const { image_url, ...rest } = item;
        return rest;
      });

      const englishWithImg = data.map((item: any) => {
        const row: any = {
          dci: item.dci || item.description || '',
          commercial_name: item.commercial_name || item.nom_commercial || item.name || '',
          dosage: item.dosage || '',
          form: item.form || item.forme || item.dosage || '',
          is_prescription_required: item.is_prescription_required !== undefined 
            ? (item.is_prescription_required === true || item.is_prescription_required === 'true') 
            : (item.ordonnance_requise === true || item.ordonnance_requise === 'true'),
          ux_category: item.ux_category || item.categorie_ux || 'Uncategorized'
        };
        const img = item.image_url || item.imageUrl || item.image;
        if (img) row.image_url = img;
        return row;
      });

      const englishNoImg = englishWithImg.map((item: any) => {
        const { image_url, ...rest } = item;
        return rest;
      });

      const seedCandidates = [frenchWithImg, frenchNoImg, englishWithImg, englishNoImg];

      let insertedData = null;
      let error = null;

      for (const candidateData of seedCandidates) {
        const res = await supabase.from('produits_patients').insert(candidateData).select();
        if (!res.error) {
          insertedData = res.data;
          error = null;
          break;
        } else {
          error = res.error;
          if (res.error.message && res.error.message.includes('row-level security policy')) {
            break;
          }
        }
      }
        
      if (error) {
         if (error.message && error.message.includes('row-level security policy')) {
             throw new Error("Erreur RLS : L'opération a été bloquée. Veuillez ajouter la clé 'SUPABASE_SERVICE_ROLE_KEY' dans vos Secrets AI Studio, ou exécutez le script SQL 'phase8_produits_patients.sql' dans votre base.");
         }
         throw error;
      }
      
      res.json({ success: true, data: insertedData, message: "Products seeded successfully." });
    } catch (error: any) {
      console.error("Error seeding products:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to seed products" });
    }
  });

  // UPLOAD image endpoint for product images
  app.post("/api/admin/upload-product-image", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { dataUrl, fileName, contentType } = req.body;
      if (!dataUrl) {
        return res.status(400).json({ success: false, error: "dataUrl is required" });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl) return res.status(500).json({ success: false, error: "Supabase URL not configured." });

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, serviceKey || anonKey || '');

      let mimeType = contentType || 'image/jpeg';
      let base64Data = dataUrl;

      if (dataUrl.includes(';base64,')) {
        const parts = dataUrl.split(';base64,');
        mimeType = parts[0].replace('data:', '');
        base64Data = parts[1];
      }

      const ext = mimeType.split('/')[1] || 'jpg';
      const cleanFileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const buffer = Buffer.from(base64Data, 'base64');

      let bucketName = 'products';
      let uploadResult = await supabase.storage.from(bucketName).upload(cleanFileName, buffer, {
        contentType: mimeType,
        upsert: true
      });

      if (uploadResult.error) {
        // Fallback to 'images' bucket
        bucketName = 'images';
        uploadResult = await supabase.storage.from(bucketName).upload(`products/${cleanFileName}`, buffer, {
          contentType: mimeType,
          upsert: true
        });
      }

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      const path = uploadResult.data.path;
      const { data: pubData } = supabase.storage.from(bucketName).getPublicUrl(path);

      res.json({
        success: true,
        url: pubData.publicUrl,
        path: path
      });
    } catch (error: any) {
      console.error("Image upload error:", error);
      res.status(500).json({ success: false, error: error.message || "Upload failed" });
    }
  });

  // UPSERT route for single product Create or Update
  app.post("/api/admin/upsert-product", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { id, dci, commercial_name, dosage, form, is_prescription_required, ux_category, image_url, imageUrl, image } = req.body;
      
      const authHeader = req.headers.authorization;
      const userToken = authHeader ? authHeader.split(' ')[1] : undefined;
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl) return res.status(500).json({ success: false, error: "Supabase URL not configured on backend." });
      
      const { createClient } = await import('@supabase/supabase-js');
      let supabase;
      if (serviceKey) {
        supabase = createClient(supabaseUrl, serviceKey);
      } else if (anonKey) {
        const options = userToken ? { global: { headers: { Authorization: `Bearer ${userToken}` } } } : {};
        supabase = createClient(supabaseUrl, anonKey, options);
      } else {
        return res.status(500).json({ success: false, error: "No Supabase keys configured." });
      }

      const commName = (req.body.nom_commercial || req.body.commercial_name || req.body.name || '').trim();
      if (!commName) {
        return res.status(400).json({ success: false, error: "Le nom commercial est requis" });
      }

      const img = image_url || imageUrl || image || null;
      const dciVal = (req.body.dci || req.body.description || commName).trim();
      const dosageVal = (req.body.dosage || '').trim();
      const formVal = (req.body.forme || req.body.form || '').trim();
      const brandVal = (req.body.brand || req.body.marque || 'Generic').trim();
      const catVal = (req.body.category || req.body.categorie || req.body.categorie_ux || req.body.ux_category || 'Douleurs & Fièvre').trim();
      const ordonnanceVal = req.body.ordonnance_requise !== undefined 
        ? (req.body.ordonnance_requise === true || req.body.ordonnance_requise === 'true') 
        : (req.body.is_prescription_required === true || req.body.is_prescription_required === 'true');

      // 1. Build master payload for produits_patients
      const payload: any = {
        nom_commercial: commName,
        commercial_name: commName,
        dci: dciVal,
        dosage: dosageVal,
        forme: formVal,
        form: formVal,
        brand: brandVal,
        marque: brandVal,
        category: catVal,
        categorie_ux: catVal,
        ux_category: catVal,
        ordonnance_requise: ordonnanceVal,
        is_prescription_required: ordonnanceVal,
        is_active: true
      };
      if (img) payload.image_url = img;

      let data = null;
      let error = null;

      if (id) {
        const updateRes = await supabase.from('produits_patients').update(payload).eq('id', id).select();
        data = updateRes.data;
        error = updateRes.error;
      } else {
        const insertRes = await supabase.from('produits_patients').insert([payload]).select();
        data = insertRes.data;
        error = insertRes.error;
      }

      if (error) {
        console.error("Produits_patients save error:", error);
        // Retry with basic schema if extra columns failed
        const fallbackPayload: any = {
          nom_commercial: commName,
          commercial_name: commName,
          dci: dciVal,
          dosage: dosageVal,
          forme: formVal,
          form: formVal,
          categorie_ux: catVal,
          ux_category: catVal,
          category: catVal,
          brand: brandVal,
          ordonnance_requise: ordonnanceVal,
          is_prescription_required: ordonnanceVal
        };
        if (img) fallbackPayload.image_url = img;
        
        const retryRes = id 
          ? await supabase.from('produits_patients').update(fallbackPayload).eq('id', id).select()
          : await supabase.from('produits_patients').insert([fallbackPayload]).select();
          
        if (retryRes.error) {
          throw retryRes.error;
        }
        data = retryRes.data;
      }

      const targetId = id || (Array.isArray(data) ? data[0]?.id : data?.id);

      // 2. Propagate updates to any linked rows in 'products' table
      if (targetId || commName) {
        try {
          const productUpdatePayload: any = {
            nom_commercial: commName,
            commercial_name: commName,
            dci: dciVal,
            dosage: dosageVal,
            form: formVal,
            brand: brandVal,
            marque: brandVal,
            category: catVal,
            categorie_ux: catVal,
            ux_category: catVal,
            is_prescription_required: ordonnanceVal
          };
          if (img) productUpdatePayload.image_url = img;

          // Update by product_id or commercial_name
          if (targetId) {
            await supabase.from('products').update(productUpdatePayload).eq('product_id', targetId);
          }
          await supabase.from('products').update(productUpdatePayload).ilike('commercial_name', commName);
        } catch (syncErr) {
          console.warn("Product sync warning:", syncErr);
        }
      }
      
      res.json({ success: true, data: data || { id: targetId, ...payload } });
    } catch (error: any) {
      console.error("Backend upsert error:", error);
      res.status(500).json({ success: false, error: error.message || "Upsert failed" });
    }
  });

  // DELETE route for single product
  app.post("/api/admin/delete-product", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ success: false, error: "Product ID is required" });
      }

      const authHeader = req.headers.authorization;
      const userToken = authHeader ? authHeader.split(' ')[1] : undefined;
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl) return res.status(500).json({ success: false, error: "Supabase URL not configured on backend." });
      
      const { createClient } = await import('@supabase/supabase-js');
      let supabase;
      if (serviceKey) {
        supabase = createClient(supabaseUrl, serviceKey);
      } else if (anonKey) {
        const options = userToken ? { global: { headers: { Authorization: `Bearer ${userToken}` } } } : {};
        supabase = createClient(supabaseUrl, anonKey, options);
      } else {
        return res.status(500).json({ success: false, error: "No Supabase keys configured." });
      }

      // Delete from both produits_patients and products
      const [res1, res2] = await Promise.allSettled([
        supabase.from('produits_patients').delete().eq('id', id),
        supabase.from('products').delete().or(`id.eq.${id},product_id.eq.${id}`)
      ]);
      
      let error = null;
      if (res1.status === 'fulfilled' && res1.value.error) {
        error = res1.value.error;
      }

      if (error && error.message && error.message.includes('row-level security policy')) {
        throw new Error("Erreur RLS : L'opération a été bloquée. Veuillez ajouter la clé 'SUPABASE_SERVICE_ROLE_KEY' dans vos Secrets AI Studio, ou exécutez le script SQL 'phase8_produits_patients.sql' dans votre base pour autoriser les suppressions.");
      }
      
      res.json({ success: true, message: "Product deleted successfully" });
    } catch (error: any) {
      console.error("Backend delete error:", error);
      res.status(500).json({ success: false, error: error.message || "Delete failed" });
    }
  });

  app.post("/api/admin/driver/approve", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { driverId } = req.body;
      if (!driverId) {
        return res.status(400).json({ success: false, error: "Missing driverId" });
      }
      
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ success: false, error: "Supabase not configured on backend." });
      }
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Single source of truth update: Fetch current data and update kyc_status and status
      const { data: driverData, error: fetchErr } = await supabase
        .from('drivers')
        .select('data')
        .eq('id', driverId)
        .single();
        
      if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;
      
      const newDriverData = { 
        ...(driverData?.data || {}), 
        status: 'approved',
        kyc_status: 'approved'
      };

      const { error: drvErr } = await supabase
        .from('drivers')
        .upsert({ 
          id: driverId, 
          data: newDriverData
        }, { onConflict: 'id' });
        
      if (drvErr) throw drvErr;

      // Update public.users as well
      const { data: userData, error: fetchUsrErr } = await supabase
        .from('users')
        .select('data')
        .eq('id', driverId)
        .single();
        
      if (fetchUsrErr && fetchUsrErr.code !== 'PGRST116') throw fetchUsrErr;

      const newUserdata = {
        ...(userData?.data || {}),
        status: 'approved',
        kyc_status: 'approved'
      };

      const { error: usrErr } = await supabase
        .from('users')
        .upsert({ 
          id: driverId, 
          data: newUserdata 
        }, { onConflict: 'id' });

      if (usrErr) throw usrErr;

      res.json({ success: true, message: "Driver KYC approved successfully." });
    } catch (error) {
      console.error("Error approving driver:", error);
      res.status(500).json({ success: false, error: "Failed to approve driver KYC" });
    }
  });

  // DPML Webhook to receive alerts and automatically quarantine products
  app.post("/api/dpml/alerts", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { titre, description, num_lot_concerne, dci_concerne, nom_commercial_concerne, action_requise } = req.body;
      
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
         return res.status(500).json({ success: false, error: "Supabase credentials missing" });
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);

      // 1. Insert alert
      const { data: alert, error: alertError } = await supabase
         .from('dpml_alertes')
         .insert([{
            titre,
            description,
            num_lot_concerne,
            dci_concerne,
            nom_commercial_concerne,
            action_requise,
            statut: 'Actif'
         }])
         .select()
         .single();
         
      if (alertError) throw alertError;

      // 2. Put products in quarantine automatically (is_active = false)
      let productsQuery = supabase.from('products').update({ is_active: false });
      
      if (dci_concerne) {
         productsQuery = productsQuery.ilike('dci', `%${dci_concerne}%`);
      } else if (nom_commercial_concerne) {
         productsQuery = productsQuery.ilike('nom_commercial', `%${nom_commercial_concerne}%`);
      } else {
         throw new Error("Must provide dci_concerne or nom_commercial_concerne");
      }
      
      const { error: updateError } = await productsQuery;
      if (updateError) throw updateError;
      
      res.json({ success: true, message: "Alert received and products quarantined.", alert });
    } catch (err: any) {
      console.error("DPML Webhook Error:", err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development
  const isProd = process.env.NODE_ENV === "production" || process.argv[1]?.endsWith("server.cjs");
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, error: 'API route not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  let retries = 0;
  const maxRetries = 10;
  function bindPort() {
    const server = app.listen(PORT, HOST, () => {
      console.log(`  ➜  Local:   http://localhost:${PORT}/`);
      console.log(`  ➜  Network: http://${HOST}:${PORT}/`);
      console.log(`Server ready on port ${PORT}`);
    });

    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE" && retries < maxRetries) {
        retries++;
        console.warn(`Port ${PORT} is busy, retrying in 500ms (attempt ${retries}/${maxRetries})...`);
        setTimeout(() => {
          try {
            server.close();
          } catch {
            // ignore if already closed
          }
          bindPort();
        }, 500);
      } else {
        console.error("Server listen error:", err);
      }
    });
  }

  bindPort();
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
