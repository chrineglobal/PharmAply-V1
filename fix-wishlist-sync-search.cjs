const fs = require('fs');

let search = fs.readFileSync('src/pages/patient/Search.tsx', 'utf8');

// Add Firebase imports if not there
if (!search.includes('addDoc') && search.includes('collection(')) {
    search = search.replace("import { collection, query, where, getDocs, limit }", "import { collection, query, where, getDocs, limit, addDoc, deleteDoc, doc }");
}

let handleHeartCode = `  const handleHeartClick = async (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    if (!user) {
      toast(t('login_required', 'Veuillez vous connecter pour ajouter aux favoris'));
      return;
    }
    
    const isWished = wishlist[product.id];
    
    const updatedWishlist = { ...wishlist, [product.id]: !isWished };
    setWishlist(updatedWishlist); // Optimistic UI
    
    try {
      if (isWished) {
        // Find and delete the favorite doc
        const q = query(collection(db, 'favorites'), where('userId', '==', user.uid), where('productId', '==', product.id));
        const snap = await getDocs(q);
        snap.docs.forEach(async (d) => {
          await deleteDoc(doc(db, 'favorites', d.id));
        });
      } else {
        // Add to favorites
        await addDoc(collection(db, 'favorites'), {
          userId: user.uid,
          productId: product.id,
          product: product,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to update favorites', err);
      // Revert optimistic update
      setWishlist({ ...wishlist, [product.id]: isWished });
    }
  };`;

search = search.replace(/const handleHeartClick = \(e: React.MouseEvent, product: any\) => \{[\s\S]*?\};/, handleHeartCode);

// Inject fetching wishlist from Firebase
const effectFirebase = `useEffect(() => {
    if (!user) return;
    const fetchFavs = async () => {
      try {
        const q = query(collection(db, 'favorites'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const favsMap: Record<string, boolean> = {};
        snap.docs.forEach(d => {
          favsMap[d.data().productId] = true;
        });
        setWishlist(favsMap);
      } catch (err) {
        console.error('Error fetching favorites', err);
      }
    };
    fetchFavs();
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {`;

search = search.replace(/useEffect\(\(\) => \{\n\s+const fetchData = async \(\) => \{/, effectFirebase);

// Also we need to import useAuth if it's missing, wait it's already used or not? Let's import if needed.
if (!search.includes('useAuth')) {
    search = search.replace(`import { useTranslation } from "react-i18next";`, `import { useTranslation } from "react-i18next";\nimport { useAuth } from "../../components/AuthProvider";`);
}
if (!search.includes('const { user } = useAuth();')) {
    search = search.replace(`const { t } = useTranslation();`, `const { t } = useTranslation();\n  const { user } = useAuth();`);
}
// Import toast if not there
if (!search.includes('toast')) {
    search = search.replace(`import { useTranslation } from "react-i18next";`, `import { useTranslation } from "react-i18next";\nimport toast from 'react-hot-toast';`);
}

fs.writeFileSync('src/pages/patient/Search.tsx', search);
