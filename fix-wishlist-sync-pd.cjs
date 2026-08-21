const fs = require('fs');

let pd = fs.readFileSync('src/pages/patient/ProductDetails.tsx', 'utf8');

// Add Firebase imports if not there
if (!pd.includes('addDoc') && pd.includes('collection(')) {
    pd = pd.replace("import { doc, getDoc, collection, query, where, getDocs }", "import { doc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc }");
}

let handleHeartCode = `  const toggleWishlist = async () => {
    if (!user) {
      toast(t('login_required', 'Veuillez vous connecter pour ajouter aux favoris'));
      return;
    }
    
    const wasWished = isWishlist;
    setIsWishlist(!isWishlist);
    
    try {
      if (wasWished) {
        // Find and delete the favorite doc
        const q = query(collection(db, 'favorites'), where('userId', '==', user.uid), where('productId', '==', product.id));
        const snap = await getDocs(q);
        snap.docs.forEach(async (d) => {
          await deleteDoc(doc(db, 'favorites', d.id));
        });
        toast(t('removed_wishlist', 'Retiré des favoris'), { icon: '💔' });
      } else {
        // Add to favorites
        await addDoc(collection(db, 'favorites'), {
          userId: user.uid,
          productId: product.id,
          product: product,
          createdAt: new Date().toISOString()
        });
        toast(t('added_wishlist', 'Ajouté aux favoris'), { icon: '❤️' });
      }
    } catch (err) {
      console.error('Failed to update favorites', err);
      setIsWishlist(wasWished); // revert
    }
  };`;

pd = pd.replace(/const toggleWishlist = \(\) => \{[\s\S]*?\};/, handleHeartCode);

const effectFirebase = `useEffect(() => {
    if (!user || !product) return;
    const fetchFavStatus = async () => {
      try {
        const q = query(collection(db, 'favorites'), where('userId', '==', user.uid), where('productId', '==', product.id));
        const snap = await getDocs(q);
        setIsWishlist(!snap.empty);
      } catch (err) {
        console.error('Error fetching favorite status', err);
      }
    };
    fetchFavStatus();
  }, [user, product]);

  useEffect(() => {
    // Scroll to top on load`;

pd = pd.replace(/useEffect\(\(\) => \{\n\s+\/\/ Scroll to top on load/, effectFirebase);

if (!pd.includes('useAuth')) {
    pd = pd.replace(`import { useTranslation } from "react-i18next";`, `import { useTranslation } from "react-i18next";\nimport { useAuth } from "../../components/AuthProvider";`);
}
if (!pd.includes('const { user } = useAuth();')) {
    pd = pd.replace(`const { t } = useTranslation();`, `const { t } = useTranslation();\n  const { user } = useAuth();`);
}

fs.writeFileSync('src/pages/patient/ProductDetails.tsx', pd);
