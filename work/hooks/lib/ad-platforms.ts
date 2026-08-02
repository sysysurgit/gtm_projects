export type PlatformId = "linkedin_ads" | "meta_ads" | "google_ads" | "reddit_ads";

export interface FormatSpec {
  id: string;
  label: string;
  titleMaxChars: number;
  descriptionMaxChars: number;
  ctaMaxChars: number;
  promptGuidance: string;
}

interface PlatformSpec {
  label: string;
  formats: FormatSpec[];
}

// Character limits — délibérément plus serrés que les limites de troncature
// réelles des régies (ex. LinkedIn tronque à ~150 car., mais titleMaxChars
// est fixé à 90) : un hook qui utilise tout le budget de troncature devient
// un paragraphe, pas une accroche. La limite ici encode un choix éditorial
// (brièveté = impact), pas seulement une contrainte technique de plateforme.
// "title" mappe vers le champ réellement scroll-stopping (intro tronquée
// LinkedIn/Meta, titre RSA Google, titre de post Reddit), "description" vers
// le texte de support.
export const PLATFORMS: Record<PlatformId, PlatformSpec> = {
  linkedin_ads: {
    label: "LinkedIn Ads",
    formats: [
      {
        id: "single_image",
        label: "Image unique",
        titleMaxChars: 90,
        descriptionMaxChars: 70,
        ctaMaxChars: 40,
        promptGuidance:
          "Le title est le texte d'intro affiché au-dessus du visuel (LinkedIn tronque vers 150 caractères, mais un hook efficace tient en 90 : une seule idée, jamais deux). La description est la ligne courte affichée sous le visuel (headline LinkedIn).",
      },
      {
        id: "video",
        label: "Vidéo",
        titleMaxChars: 90,
        descriptionMaxChars: 70,
        ctaMaxChars: 40,
        promptGuidance:
          "Le title doit fonctionner comme une accroche lue ou affichée en overlay dans les 3 premières secondes de la vidéo, pas juste comme texte d'intro passif.",
      },
      {
        id: "document",
        label: "Document / Thought leadership",
        titleMaxChars: 90,
        descriptionMaxChars: 70,
        ctaMaxChars: 40,
        promptGuidance:
          "Le title doit donner envie d'ouvrir le document (promesse d'insight/de donnée concrète), pas vendre directement.",
      },
    ],
  },
  meta_ads: {
    label: "Meta Ads (Facebook/Instagram)",
    formats: [
      {
        id: "feed_image",
        label: "Feed — Image/Vidéo",
        titleMaxChars: 70,
        descriptionMaxChars: 27,
        ctaMaxChars: 40,
        promptGuidance:
          "Le title est le \"primary text\" (Meta tronque vers 125 caractères, mais reste sous 70 pour un vrai hook). La description (27 caractères recommandés, 40 max) est une ligne très courte et percutante (headline Meta).",
      },
      {
        id: "carousel",
        label: "Carousel",
        titleMaxChars: 60,
        descriptionMaxChars: 45,
        ctaMaxChars: 40,
        promptGuidance:
          "Format carousel : le primary text est court car chaque carte a son propre headline (45 car.) qui doit fonctionner comme une mini-accroche indépendante dans une narration qui se déroule carte après carte.",
      },
      {
        id: "stories_reels",
        label: "Stories / Reels",
        titleMaxChars: 70,
        descriptionMaxChars: 27,
        ctaMaxChars: 40,
        promptGuidance:
          "Format plein écran, consommé en moins de 2 secondes : le title doit être compréhensible sans le son et sans lire au-delà de la première ligne.",
      },
    ],
  },
  google_ads: {
    label: "Google Ads",
    formats: [
      {
        id: "rsa",
        label: "Responsive Search Ads",
        titleMaxChars: 30,
        descriptionMaxChars: 90,
        ctaMaxChars: 40,
        promptGuidance:
          "Google recombine automatiquement les titres et descriptions entre eux — le title doit donc être compréhensible ISOLÉMENT (intention de recherche, bénéfice, preuve, ou appel à l'action), sans dépendre d'un autre élément pour faire sens.",
      },
    ],
  },
  reddit_ads: {
    label: "Reddit Ads",
    formats: [
      {
        id: "text_post",
        label: "Post texte",
        titleMaxChars: 70,
        descriptionMaxChars: 250,
        ctaMaxChars: 40,
        promptGuidance:
          "Les redditors détestent le ton publicitaire classique — le title doit sonner comme un titre de post authentique (curiosité, débat, retour d'expérience), pas comme une accroche marketing.",
      },
      {
        id: "image_video",
        label: "Image / Vidéo",
        titleMaxChars: 70,
        descriptionMaxChars: 250,
        ctaMaxChars: 40,
        promptGuidance:
          "Même logique que le post texte : titre qui sonne authentique, pas publicitaire. La description peut référencer ce qui est montré dans le visuel s'il est fourni.",
      },
    ],
  },
};

export function getFormatSpec(platform: PlatformId, formatId: string): FormatSpec | null {
  return PLATFORMS[platform]?.formats.find((f) => f.id === formatId) ?? null;
}
