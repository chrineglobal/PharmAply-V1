const fs = require('fs');
let content = fs.readFileSync('src/components/ProductCard.tsx', 'utf8');

content = content.replace("const navigate = useNavigate();", "const { t } = useTranslation();\n  const navigate = useNavigate();");
content = content.replace("'Médicament'", "t('medicine_fallback', 'Médicament')");
content = content.replace("'Produit sans nom'", "t('unnamed_product', 'Produit sans nom')");
content = content.replace("'Pharmacie Partenaire'", "t('partner_pharmacy', 'Pharmacie Partenaire')");
content = content.replace("toast.success(\"Produit ajouté au panier\")", "toast.success(t('product_added_to_cart', 'Produit ajouté au panier'))");

fs.writeFileSync('src/components/ProductCard.tsx', content);
