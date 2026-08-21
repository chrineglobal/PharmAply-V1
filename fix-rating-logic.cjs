const fs = require('fs');

let tracking = fs.readFileSync('src/pages/patient/Tracking.tsx', 'utf8');

const ratingModals = `
  const [showProductRatingModal, setShowProductRatingModal] = useState(false);
  const [productRatings, setProductRatings] = useState<Record<string, { rating: number, comment: string }>>({});
`;

if (!tracking.includes('showProductRatingModal')) {
    tracking = tracking.replace('const [showRatingModal, setShowRatingModal] = useState(false);', `const [showRatingModal, setShowRatingModal] = useState(false);\n  const [showProductRatingModal, setShowProductRatingModal] = useState(false);\n  const [productRatings, setProductRatings] = useState<Record<string, { rating: number, comment: string }>>({});\n  const [hasPromptedRating, setHasPromptedRating] = useState(false);`);
}

// Effect to auto-prompt when delivered
const autoPromptEffect = `
  useEffect(() => {
    if (order?.status === 'delivered' && !hasPromptedRating && !order?.hasBeenRated) {
      // Auto prompt
      const timer = setTimeout(() => {
        setShowProductRatingModal(true);
        setHasPromptedRating(true);
      }, 2000); // 2 seconds after status change
      return () => clearTimeout(timer);
    }
  }, [order?.status, hasPromptedRating, order?.hasBeenRated]);
`;

if (!tracking.includes('hasPromptedRating')) {
    tracking = tracking.replace('// --- USE-EFFECTS ---', `// --- USE-EFFECTS ---\n${autoPromptEffect}`);
}

// Submit Product Rating function
const submitProductRatingsCode = `
  const submitProductRatings = async () => {
    if (!order || !order.items) return;
    try {
      setLoadingRatings(true);
      
      const ratingPromises = order.items.map(async (item: any) => {
        const pRating = productRatings[item.id] || { rating: 5, comment: '' };
        await addDoc(collection(db, 'product_reviews'), {
          productId: item.id || item.productId,
          orderId: order.id,
          userId: user?.uid,
          userName: user?.displayName || 'Client',
          rating: pRating.rating,
          comment: pRating.comment,
          createdAt: new Date().toISOString()
        });
      });
      
      await Promise.all(ratingPromises);
      
      toast.success('Merci pour votre avis sur les produits !');
      setShowProductRatingModal(false);
      
      // Immediately open driver rating if assigned
      if (driver) {
        setTimeout(() => setShowRatingModal(true), 500);
      } else {
        await updateDoc(doc(db, 'orders', order.id), { hasBeenRated: true });
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la soumission');
    } finally {
      setLoadingRatings(false);
    }
  };
`;

if (!tracking.includes('submitProductRatings')) {
    tracking = tracking.replace('const handleRatingSubmit = async', `${submitProductRatingsCode}\n\n  const [loadingRatings, setLoadingRatings] = useState(false);\n  const handleRatingSubmit = async`);
}

fs.writeFileSync('src/pages/patient/Tracking.tsx', tracking);
