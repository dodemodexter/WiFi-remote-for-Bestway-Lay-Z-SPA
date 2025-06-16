// i18n.js - Fichier de gestion de l'internationalisation

let translations = {}; // Stocke les traductions chargées pour la langue actuelle
let currentLanguage = localStorage.getItem('appLang') || 'en'; // Langue actuelle, par défaut 'en' ou celle stockée localement

/**
 * Fonction principale de traduction.
 * Si la langue est l'anglais, elle renvoie la clé (le texte anglais par défaut).
 * Sinon, elle recherche la traduction dans les données chargées.
 * Supporte le remplacement de placeholders (ex: "Hello {name}").
 * @param {string} key - La clé de traduction (qui est le texte anglais par défaut).
 * @param {Object} [replacements={}] - Un objet de paires clé-valeur pour remplacer les placeholders dans la traduction.
 * @returns {string} Le texte traduit ou la clé si la traduction n'est pas trouvée.
 */
function i18n(key, replacements = {}) {
    let translatedText = key; // Par défaut, la clé est le texte anglais

    // Si la langue actuelle n'est pas l'anglais et que des traductions sont disponibles pour cette langue
    if (currentLanguage !== 'en' && translations[currentLanguage]) {
        // Tente de récupérer la traduction
        const foundTranslation = translations[currentLanguage][key];
        if (foundTranslation !== undefined) {
            translatedText = foundTranslation;
        }
    }

    // Applique les remplacements de placeholders si présents
    for (const placeholder in replacements) {
        if (replacements.hasOwnProperty(placeholder)) {
            const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
            translatedText = translatedText.replace(regex, replacements[placeholder]);
        }
    }

    return translatedText;
}

/**
 * Fonction pour obtenir le code de locale approprié pour les dates
 * @returns {string} Le code de locale (ex: 'fr-FR', 'en-US')
 */
function getDateLocale() {
    const localeMap = {
        'fr': 'fr-FR',
        'es': 'es-ES',
        'pt': 'pt-PT',
        'it': 'it-IT',
        'de': 'de-DE',
        'en': 'en-US'
    };
    return localeMap[currentLanguage] || 'en-US';
}

/**
 * Traduit les éléments de la page qui ont des attributs `data-i18n` ou `data-i18n-title`.
 */
function translatePage() {
    // Traduire le titre de la page si data-i18n est présent
    const titleElement = document.querySelector('title[data-i18n]');
    if (titleElement) {
        titleElement.textContent = i18n(titleElement.getAttribute('data-i18n'));
    }

    // Traduire les éléments avec l'attribut data-i18n (pour le texte)
    document.querySelectorAll('[data-i18n]').forEach(element => {
        // Évite de traduire le titre de la page deux fois
        if (element.tagName.toLowerCase() === 'title') return;

        const key = element.getAttribute('data-i18n');
        // Pour les options de select, s'assurer de ne pas écraser la valeur
        if (element.tagName.toLowerCase() === 'option') {
             element.textContent = i18n(key);
        } else {
            element.textContent = i18n(key);
        }
    });

    // Traduire les éléments avec l'attribut data-i18n-title (pour les tooltips)
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
        const key = element.getAttribute('data-i18n-title');
        element.title = i18n(key);
    });

    // Traduire les placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = i18n(key);
    });

    // Mettre à jour l'option sélectionnée dans le sélecteur de langue
    const languageSelector = document.getElementById('language-selector');
    if (languageSelector) {
        languageSelector.value = currentLanguage;
    }
}

/**
 * Charge les traductions pour la langue spécifiée et met à jour la page.
 * @param {string} lang - Le code de la langue à charger (ex: 'fr', 'es').
 */
async function setLanguage(lang) {
   // console.log(`🌐 Changement de langue vers: ${lang}`);
document.documentElement.lang = lang;
    currentLanguage = lang;
    localStorage.setItem('appLang', lang); // Sauvegarde la langue dans le localStorage
	updateTime();

    if (lang === 'en') {
        translations = {}; // Pas besoin de charger un fichier pour l'anglais (il est en dur)
        translatePage();
      //  console.log(`✅ Langue anglaise activée`);
        return;
    }

    // Charge le fichier JSON de la langue
    try {
      //  console.log(`📁 Tentative de chargement de ${lang}.json`);
        
        // Vérifier d'abord si le fichier existe
        const testResponse = await fetch(`${lang}.json`, { method: 'HEAD' });
        if (!testResponse.ok) {
            throw new Error(`Fichier ${lang}.json non trouvé (${testResponse.status})`);
        }
        
        const response = await fetch(`${lang}.json`);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
        }
        
        const responseText = await response.text();
        //console.log(`📄 Contenu reçu (${responseText.length} caractères)`);
        
        if (!responseText.trim()) {
            throw new Error('Le fichier de traduction est vide');
        }
        
        // Vérifier que c'est du JSON valide
        let jsonData;
        try {
            jsonData = JSON.parse(responseText);
        } catch (parseError) {
            console.error(`❌ Erreur de parsing JSON:`, parseError);
            console.error(`📄 Contenu problématique:`, responseText.substring(0, 500));
            throw new Error(`JSON invalide: ${parseError.message}`);
        }
        
        translations[lang] = jsonData;
       // console.log(`✅ ${Object.keys(jsonData).length} traductions chargées pour ${lang}`);
        
        translatePage(); // Met à jour l'interface après le chargement
        
    } catch (error) {
        console.error(`❌ Erreur lors du chargement de ${lang}:`, error.message);
        
        // Fallback vers l'anglais en cas d'erreur
       // console.log(`🔄 Fallback vers l'anglais`);
        currentLanguage = 'en';
        localStorage.setItem('appLang', 'en');
        translations = {}; // Réinitialise les traductions pour l'anglais
        translatePage();
        
        // Afficher une notification à l'utilisateur (optionnel)
        if (typeof showModal === 'function') {
            showModal('Erreur', `Impossible de charger la langue ${lang}. Retour à l'anglais.`, null, null);
        }
    }
}

// Événement au chargement complet du DOM
document.addEventListener('DOMContentLoaded', () => {
   // console.log(`🚀 Initialisation i18n - Langue stockée: ${currentLanguage}`);
    
    // Initialisation du sélecteur de langue
    const languageSelector = document.getElementById('language-selector');
    if (languageSelector) {
      //  console.log(`🎛️ Sélecteur de langue trouvé`);
        
        languageSelector.addEventListener('change', (event) => {
      //      console.log(`🔄 Changement manuel vers: ${event.target.value}`);
            setLanguage(event.target.value);
        });
        
        // S'assurer que le sélecteur affiche la langue initialement définie
        languageSelector.value = currentLanguage;
    } else {
        console.warn(`⚠️ Sélecteur de langue non trouvé`);
    }

    // Charger la langue initialement au démarrage de l'application
    setLanguage(currentLanguage);
});

// Expose la fonction i18n globalement pour être utilisée dans d'autres scripts
window.i18n = i18n;
// Exposer également setLanguage si d'autres parties du code en ont besoin directement
window.setLanguage = setLanguage;
// Exposer getDateLocale pour les fonctions de date
window.getDateLocale = getDateLocale;