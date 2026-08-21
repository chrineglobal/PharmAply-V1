const fs = require('fs');
let content = fs.readFileSync('src/pages/patient/Home.tsx', 'utf8');

const locationHook = `
  const [exactLocation, setExactLocation] = useState<string>('');
  
  useEffect(() => {
    if (userData?.deliveryAddress || userData?.address) {
       setExactLocation(userData.deliveryAddress || userData.address);
       return;
    }
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
           const { latitude, longitude } = position.coords;
           const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
           if (!apiKey) return;
           const res = await fetch(\`https://maps.googleapis.com/maps/api/geocode/json?latlng=\${latitude},\${longitude}&key=\${apiKey}\`);
           const data = await res.json();
           if (data.status === "OK" && data.results.length > 0) {
             // Try to find a short version (e.g. street + city)
             const comps = data.results[0].address_components;
             let route = comps.find(c => c.types.includes('route'))?.long_name;
             let city = comps.find(c => c.types.includes('locality'))?.long_name;
             
             let shortAddr = "";
             if (route && city) shortAddr = route + ", " + city;
             else if (city) shortAddr = city;
             else shortAddr = data.results[0].formatted_address;
             
             setExactLocation(shortAddr);
           }
        } catch (e) {
           console.error(e);
        }
      }, (err) => {
         console.warn("Geoloc err:", err);
      });
    }
  }, [userData]);
`;

// Insert the hook inside the component
const componentStart = content.indexOf('export function PatientHome() {');
if (componentStart !== -1) {
    const insertPos = content.indexOf('const { t } = useTranslation();', componentStart) + 'const { t } = useTranslation();'.length;
    content = content.substring(0, insertPos) + locationHook + content.substring(insertPos);
}

// Replace the render part
content = content.replace(
  "{userData?.address || t('home_delivery', 'Livraison à domicile')}",
  "{exactLocation || t('home_delivery', 'Recherche de la position...')}"
);

fs.writeFileSync('src/pages/patient/Home.tsx', content);
console.log("Home location patched.");
