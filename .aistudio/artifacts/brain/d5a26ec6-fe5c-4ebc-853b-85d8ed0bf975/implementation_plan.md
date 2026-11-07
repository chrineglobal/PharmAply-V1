# Assistant Pharmacien IA Gemini & Localisation Pharmacies Google Maps Grounding

Intégration d'un assistant pharmacien conversationnel multi-tours propulsé par Gemini et d'un moteur de découverte et de recommandation des officines de garde et partenaires enrichi par Google Maps Grounding en temps réel.

### User Review & Critical Decisions

> [!IMPORTANT]
> Les choix d'expérience utilisateur suivants ont été confirmés lors de la phase de cadrage et guident l'architecture :

- **Bouton flottant & Modal dédié** : Le chatbot est accessible depuis toutes les vues patient via une bulle d'action flottante ergonomique discrète (avec badge de disponibilité) qui s'ouvre dans un modal/tiroir optimisé pour le mobile et le desktop.
- **Google Maps Grounding complet** : Utilisation du modèle `gemini-3.8-flash` avec l'outil `googleMaps` et coordonnées GPS réelles (`navigator.geolocation`) pour géolocaliser les pharmacies partenaires et de garde, vérifier les adresses, afficher les liens officiels Google Maps et calculer les itinéraires.
- **Rôles combinés de l'Assistant** : Le chatbot prend en charge les conseils de posologie, les interactions médicamenteuses, l'assistance à la commande et l'orientation d'urgence vers les officines disponibles.

---

### 1. Overview & Core Concept

- **Ce que fait la fonctionnalité** : 
  1. Offre un assistant virtuel intelligent ("Docteur Conseil PharmAply") capable de dialoguer de manière fluide, de se souvenir de l'historique de la discussion, de répondre aux interrogations sur les médicaments, d'alerter sur les contre-indications et de guider vers l'achat sécurisé.
  2. Fournit un onglet interactif "Pharmacies Proches & Garde" au sein du chat et dans l'interface, interrogeant l'API Gemini avec Google Maps Grounding pour extraire les pharmacies réelles à proximité, leurs horaires, avis et liens directs Maps.
- **Public cible & Contexte** : Patients recherchant une assistance rapide à toute heure (notamment la nuit ou le week-end pour les officines de garde), des éclaircissements sur une posologie ou une orientation géographique immédiate.
- **Valeur ajoutée** : Réassurance médicale immédiate conforme aux règles de prudence pharmaceutique, accès en un clic aux officines réelles avec navigation GPS, et fluidification du parcours d'achat.

---

### 2. User Experience & Visual Design

- **Parcours Utilisateur** :
  1. *Déclencheur universel* : Bouton flottant circulaire en bas à droite de l'écran avec icône d'assistant santé et indicateur de présence discret.
  2. *Fenêtre de chat conversationnel* :
     - En-tête sécurisé avec statut du Pharmacien Conseil IA et bascule rapide vers les suggestions fréquentes (ex: "Pharmacie de garde près de moi", "Posologie Doliprane", "Vérifier une ordonnance").
     - Fil de discussion avec bulles typographiques contrastées (patient en bleu/vert marque, assistant en surface neutre douce avec logo de certification santé).
     - Rendu Markdown soigné pour la lisibilité des dosages et précautions.
  3. *Cartes d'officines Google Maps Grounding* :
     - Affichage des fiches officines sourcées via Google Maps avec nom, statut d'ouverture, adresse vérifiée et bouton direct "Itinéraire Maps" (`maps.uri`).
  4. *Actions intégrées dans le chat* :
     - Bouton "Ajouter au panier" ou "Voir dans le catalogue" lorsque des médicaments disponibles sont mentionnés.
     - Prise en compte de la position GPS du patient via géolocalisation navigateur.
- **Direction Visuelle & Thème** :
  - *Palette* : Conforme à la charte PharmAply (vert canard profond `#194B4B`, blanc pur, surfaces ardoise subtiles en dark mode).
  - *Typographie* : Plus Jakarta Sans pour les titres et corps, police à espacement fixe (`font-mono tabular-nums`) pour les horaires et distances.
  - *Ergonomie Mobile Touch* : Cible tactile de 48px pour le bouton flottant, boîte de saisie avec touche d'envoi rapide et suggestions horizontales défilables au doigt.

---

### 3. Key Product Decisions & Trade-Offs

- **Décision 1 : Architecture Serveur Sécurisée (Backend Proxy)**
  - *Approche retenue* : Les requêtes Gemini et Google Maps Grounding sont exécutées exclusivement côté serveur Express dans `server.ts` (`/api/ai/chat` et `/api/ai/maps-pharmacies`).
  - *Pourquoi* : Respect strict des règles de sécurité AI Studio (la clé `GEMINI_API_KEY` ne transite jamais vers le client) et gestion centralisée des prompts système et des filtres de sécurité médicale.
- **Décision 2 : Sélection Dynamique des Modèles**
  - *Approche retenue* : 
    - `gemini-3.8-flash` par défaut avec l'outil `googleMaps` pour toutes les requêtes géographiques et les conversations générales.
    - `gemini-3.1-flash-lite` pour les questions rapides et la génération d'accroches/résumés instantanés.
    - `gemini-4-argon` configurable pour les analyses complexes de poly-médication.
  - *Pourquoi* : Équilibre optimal entre réactivité, pertinence clinique et coût de calcul.
- **Décision 3 : Conformité Réglementaire et Clause de Non-Responsabilité Médicale**
  - *Approche retenue* : Rappel discret et permanent que l'assistant IA est un outil d'orientation informative et ne remplace pas une consultation médicale d'urgence (SAMU 15 / 112).

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       Client React                          │
│                                                             │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │ FloatingAiButton.tsx    │   │ AiPharmacistModal.tsx   │  │
│  │ (Accessible Partout)    │──>│ (Fil multi-tours, Maps) │  │
│  └─────────────────────────┘   └───────────┬─────────────┘  │
└────────────────────────────────────────────┼────────────────┘
                                             │ HTTP POST
                                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Serveur Express (server.ts)              │
│                                                             │
│  ┌────────────────────────┐      ┌────────────────────────┐ │
│  │ POST /api/ai/chat      │      │ POST /api/ai/maps-     │ │
│  │ - Historique multi-tour│      │      pharmacies        │ │
│  │ - System Prompt Médical│      │ - Google Maps Grounding│ │
│  └───────────┬────────────┘      └───────────┬────────────┘ │
└──────────────┼───────────────────────────────┼──────────────┘
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                Google Gen AI SDK (@google/genai)            │
│                                                             │
│   • Modèle : gemini-3.8-flash                               │
│   • Tool : { googleMaps: {} }                               │
│   • Config : retrievalConfig.latLng (GPS Patient)           │
│   • Extraction : groundingChunks (URIs Maps officielles)    │
└─────────────────────────────────────────────────────────────┘
```

#### Endpoints Backend à implémenter dans `server.ts` :
1. `POST /api/ai/chat` :
   - Reçoit `messages` (historique `{ role, parts: [{ text }] }`), `userLocation: { latitude, longitude }`, et mode d'analyse.
   - Initialise `@google/genai` avec `gemini-3.8-flash`.
   - Inclut le prompt système définissant le rôle de Pharmacien Conseil PharmAply.
   - Active l'outil `googleMaps` dès qu'une intention géographique ou de pharmacie de garde est détectée, avec extraction des `groundingChunks` (liens Maps, avis, coordonnées).
2. `POST /api/ai/nearby-pharmacies` :
   - Point d'accès dédié rapide pour récupérer la liste des officines ouvertes et de garde avec liens Google Maps directs.

#### Composants Frontend :
1. `src/components/ai/AiPharmacistModal.tsx` : Interface de chat moderne, fil de messages avec horodatages, bulles Markdown, cartes des pharmacies avec liens Google Maps et actions rapides.
2. `src/components/ai/FloatingAiAssistant.tsx` : Bouton flottant persistant avec animation subtile et déclencheur global.
3. Intégration dans `src/App.tsx` pour une disponibilité immédiate sur toutes les vues de l'application.
