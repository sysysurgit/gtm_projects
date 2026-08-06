// "Direction créative" — inspire la génération du style d'un publicitaire,
// d'une agence historique ou d'un groupe holding réel/culturel. Feature
// ludique demandée par l'utilisateur : "Des hooks comme... Buzzman, Ogilvy,
// Burger King, etc. Tu veux voir comment X,Y,Z l'aurait fait." Optionnelle,
// jamais requise — un brief sans style choisi génère exactement comme avant.
//
// `guidance` est injecté dans le system prompt Gemini : il décrit une
// MANIÈRE DE FAIRE (angle, ton, méthode), jamais un slogan ou une œuvre
// protégée à copier — le but est de s'inspirer d'une philosophie créative
// documentée publiquement, pas de reproduire un texte existant.
export interface CreativeStyle {
  id: string;
  name: string;
  org: string;
  hint: string; // courte punchline affichée dans le sélecteur
  guidance: string; // injecté dans le prompt Gemini
}

export const CREATIVE_STYLES: CreativeStyle[] = [
  {
    id: "ogilvy",
    name: "David Ogilvy",
    org: "Ogilvy & Mather",
    hint: "Preuve, recherche, promesse claire — \"le consommateur n'est pas idiot\"",
    guidance:
      "Écris comme David Ogilvy : factuel et respectueux de l'intelligence du lecteur, jamais de tricks ni de jeux de mots dans le hook. Ancre chaque angle sur une promesse claire et un fait vérifiable (chiffre, preuve, bénéfice concret) plutôt que sur une émotion vague. Le ton est confiant, informatif, presque journalistique — la crédibilité vend, pas le tape-à-l'œil.",
  },
  {
    id: "buzzman",
    name: "Buzzman",
    org: "Agence Buzzman (Paris)",
    hint: "Humour trash, second degré, culture internet assumée",
    guidance:
      "Écris comme l'agence Buzzman : humour direct, second degré, parfois volontairement trash ou provocateur, avec une complicité assumée avec la cible (auto-dérision de la marque, clins d'œil à la culture internet). Le hook doit surprendre par son audace et son culot plus que par son sérieux — jamais corporate, jamais lisse.",
  },
  {
    id: "leo_burnett",
    name: "Leo Burnett",
    org: "Leo Burnett Company",
    hint: "\"L'inherent drama\" — la vérité humaine cachée dans le produit",
    guidance:
      "Écris comme Leo Burnett : cherche le \"drame inhérent\" du produit — la vérité humaine ou émotionnelle déjà présente dans ce qu'il fait, sans l'inventer artificiellement. Ton chaleureux, simple, presque narratif, comme une histoire vraie plutôt qu'un argument de vente. Évite les effets de manche : la sincérité et la clarté priment sur le spectaculaire.",
  },
  {
    id: "george_lois",
    name: "George Lois",
    org: "Papert Koenig Lois / couvertures Esquire",
    hint: "La \"Big Idea\" choc — une image-concept qui claque",
    guidance:
      "Écris comme George Lois : vise LA grande idée provocatrice, celle qui claque en une fraction de seconde, quitte à confronter frontalement le lecteur. Pas de recherche, pas de nuance — un instinct créatif pur, une idée visuelle forte condensée en une phrase choc. Le hook doit être culotté, presque dérangeant, jamais consensuel.",
  },
  {
    id: "mary_wells_lawrence",
    name: "Mary Wells Lawrence",
    org: "Wells Rich Greene",
    hint: "Flamboyance et showmanship — la marque comme spectacle",
    guidance:
      "Écris comme Mary Wells Lawrence : flamboyant, glamour, plein de panache — traite la marque comme un spectacle total, pas une simple annonce. Le ton est confiant, joyeux, théâtral, avec une énergie assumée et un brin de séduction. Le hook doit donner envie de faire partie du show, pas juste d'acheter un produit.",
  },
  {
    id: "jacques_seguela",
    name: "Jacques Séguéla",
    org: "RSCG / Havas",
    hint: "Storytelling incarné, formules chocs à la française",
    guidance:
      "Écris comme Jacques Séguéla : construis le hook autour d'une formule choc, presque un aphorisme, qui inscrit la marque dans une histoire ou une identité plus grande qu'elle-même. Ton français, incarné, parfois un brin politique ou philosophique, avec une pointe de malice. Privilégie la formule qui reste en tête à l'argument rationnel.",
  },
  {
    id: "hal_riney",
    name: "Hal Riney",
    org: "Hal Riney & Partners / Publicis & Hal Riney",
    hint: "Voix off chaleureuse, storytelling nostalgique, \"Morning in America\"",
    guidance:
      "Écris comme Hal Riney : ton chaleureux, posé, presque nostalgique — comme une voix off qui raconte une histoire plutôt qu'un vendeur qui interpelle. Évite l'urgence et le cri ; préfère la sincérité feutrée, l'americana tranquille, une émotion qui s'installe lentement plutôt qu'un choc immédiat.",
  },
  {
    id: "don_draper",
    name: "Don Draper",
    org: "Sterling Cooper (Mad Men — figure culturelle de la pub)",
    hint: "Vendre une émotion, pas un produit — élégance et nostalgie",
    guidance:
      "Écris comme le personnage Don Draper : ne vends jamais le produit directement, vends l'émotion ou le désir qu'il représente (appartenance, nostalgie, réussite, désir). Phrases élégantes, un rien mélancoliques, construites autour d'une vérité psychologique universelle plutôt que d'une fonctionnalité.",
  },
  {
    id: "wpp",
    name: "WPP",
    org: "Groupe WPP",
    hint: "Orchestration data-driven à l'échelle mondiale",
    guidance:
      "Écris avec la rigueur d'un groupe comme WPP : approche stratégique et data-driven, message pensé pour une cohérence multi-marché et multi-canal. Ton professionnel, structuré, orienté performance mesurable — la créativité sert une stratégie business explicite, pas l'inverse.",
  },
  {
    id: "dentsu",
    name: "Dentsu",
    org: "Groupe Dentsu",
    hint: "Précision, innovation technologique, exécution impeccable",
    guidance:
      "Écris avec la précision d'une agence comme Dentsu : exécution soignée, sens du détail, intégration subtile de la technologie ou de l'innovation comme preuve de sérieux. Ton discipliné et moderne, jamais brouillon, avec une pointe de sophistication culturelle.",
  },
  {
    id: "publicis",
    name: "Publicis",
    org: "Groupe Publicis",
    hint: "\"Power of One\" — créativité et IA au service de la performance",
    guidance:
      "Écris dans l'esprit Publicis \"Power of One\" : créativité mise directement au service de la performance business, ton moderne et agile, à l'aise avec la technologie et la donnée. Le hook doit sonner à la fois créatif et orienté résultat, jamais gratuit.",
  },
  {
    id: "havas",
    name: "Havas",
    org: "Groupe Havas",
    hint: "\"Meaningful\" — une pub qui a du sens",
    guidance:
      "Écris dans l'esprit Havas \"Meaningful\" : ancre le hook dans une utilité ou un sens réel pour la cible, pas juste un argument commercial. Ton engagé et responsable, qui donne l'impression que la marque contribue à quelque chose de plus grand qu'elle-même.",
  },
];

export function getCreativeStyle(id: string | null | undefined): CreativeStyle | null {
  if (!id) return null;
  return CREATIVE_STYLES.find((s) => s.id === id) ?? null;
}
