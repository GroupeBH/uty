export const SUPPORT_EMAIL =
    process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@uty.app';

export const COMMUNITY_RULES = [
    'Uty applique une tolérance zéro envers les contenus illégaux, haineux, violents, sexuels, trompeurs, harcelants ou autrement répréhensibles.',
    'Les menaces, insultes, discriminations, arnaques et comportements abusifs envers d’autres utilisateurs sont interdits.',
    'Vous êtes responsable du contenu que vous publiez et vous vous engagez à respecter les lois, les droits des tiers et les présentes règles.',
    'Tout contenu peut être signalé. Uty examine les signalements dans un délai maximal de 24 heures.',
    'Uty peut retirer sans préavis un contenu interdit et suspendre ou exclure définitivement son auteur.',
    'Les utilisateurs peuvent bloquer un auteur abusif afin de masquer immédiatement son contenu.',
] as const;

export const EULA_INTRO =
    'En créant un compte ou en vous connectant à Uty, vous acceptez les présentes Conditions d’utilisation (EULA) et les règles de la communauté ci-dessous.';
