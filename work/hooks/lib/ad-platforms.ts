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
        // Limites réelles Meta (2026) : primary text tronqué à ~125 car.
        // ("Voir plus"), headline 40 max (FB Feed recommande 27).
        titleMaxChars: 125,
        descriptionMaxChars: 27,
        ctaMaxChars: 40,
        promptGuidance:
          "Le title est le « primary text » : Meta le tronque à ~125 caractères avec un lien « Voir plus » — tout ce qui dépasse est caché derrière un clic. Reste nettement sous 125 : un hook efficace tient en 1-3 lignes. La description est la headline affichée sous le visuel (FB Feed recommande 27 caractères, max 40).",
      },
      {
        id: "carousel",
        label: "Carousel",
        // Headline par carte : 40 caractères max (limite réelle Meta).
        titleMaxChars: 125,
        descriptionMaxChars: 40,
        ctaMaxChars: 40,
        promptGuidance:
          "Format carousel : le primary text (title, ~125 car. avant troncature) est l'accroche générale, et la description est la headline de carte (40 caractères MAXIMUM — Meta tronque au-delà) qui doit fonctionner comme une mini-accroche indépendante dans une narration carte après carte.",
      },
      {
        id: "stories_reels",
        label: "Stories / Reels",
        // Reels : primary text recommandé 40-72 car., headline 10 car. max.
        titleMaxChars: 72,
        descriptionMaxChars: 10,
        ctaMaxChars: 40,
        promptGuidance:
          "Format plein écran consommé en moins de 2 secondes : le title (primary text) doit tenir en 40-72 caractères (recommandation Meta Reels) et être compréhensible sans le son. La description (headline) est limitée à 10 caractères — c'est un mot-clé court, pas une phrase.",
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
        // Limites réelles Reddit (2026) : headline jusqu'à 300 car., mais
        // troncature mobile dès ~80-145 car. — la safe zone recommandée est
        // ≤80. Le body (description) accepte jusqu'à 40 000 car. ; on garde
        // 250 pour un post efficace, pas un pavé.
        titleMaxChars: 80,
        descriptionMaxChars: 250,
        ctaMaxChars: 40,
        promptGuidance:
          "Les redditors détestent le ton publicitaire classique — le title (headline du post promu) doit sonner comme un titre de post authentique (curiosité, débat, retour d'expérience), pas comme une accroche marketing. Reddit tronque la headline sur mobile : reste sous 80 caractères. La description est le corps du post (jusqu'à 250 caractères ici, Reddit accepte bien plus mais un post efficace est court) : développe l'idée, donne le contexte, jamais un argumentaire de vente.",
      },
      {
        id: "image_video",
        label: "Image / Vidéo",
        titleMaxChars: 80,
        descriptionMaxChars: 250,
        ctaMaxChars: 40,
        promptGuidance:
          "Même logique que le post texte : titre (headline ≤ 80 car. recommandés, troncature mobile au-delà) qui sonne authentique, pas publicitaire. La description peut référencer ce qui est montré dans le visuel s'il est fourni, et développer le contexte en 250 caractères max.",
      },
    ],
  },
};

export function getFormatSpec(platform: PlatformId, formatId: string): FormatSpec | null {
  return PLATFORMS[platform]?.formats.find((f) => f.id === formatId) ?? null;
}
