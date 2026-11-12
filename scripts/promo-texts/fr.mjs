// Textes des visuels promotionnels – français. Mise en page : scripts/make-carousels.mjs.
// &nbsp; avant « ? : ! » selon la typographie française.
export default {
  ui: {
    app: 'Gratitude – Journal',
    swipe: 'Faites défiler →',
    answer: 'Votre réponse&nbsp;:',
    step: 'Étape',
    dayPrompt: 'Pour quoi suis-je reconnaissant(e) aujourd’hui&nbsp;?',
    getIt: 'Gratuit sur Google Play',
    linkBio: 'Lien dans la bio ↑',
    searchPlay: 'Cherchez sur Google Play&nbsp;: «&nbsp;Gratitude Journal&nbsp;»',
    liWhere: 'Mon app&nbsp;: «&nbsp;Gratitude – Journal&nbsp;» sur Google Play',
    ctaSub: 'Une minute par jour pour ce qui va bien. En texte, en photo ou à voix haute.',
    ctaMeta: 'Android · 7 langues',
    appMeta: 'Android · 7 langues · gratuit',
    weekdays: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
  },

  instagram: {
    questions: {
      cover: { kicker: 'Journal de gratitude', title: '10 questions quand vous ne savez pas quoi écrire', sub: 'Enregistrez ce post et revenez-y ce soir.' },
      items: [
        'Quelle petite chose s’est bien passée aujourd’hui&nbsp;?',
        'Qui vous a fait sourire aujourd’hui&nbsp;?',
        'Qu’est-ce qui vous a fait rire aujourd’hui&nbsp;?',
        'Pour quoi pouvez-vous remercier votre corps aujourd’hui&nbsp;?',
        'Quel goût, parfum ou son d’aujourd’hui voulez-vous garder&nbsp;?',
        'Quelle nouveauté a éveillé votre curiosité aujourd’hui&nbsp;?',
        'Qui voulez-vous remercier aujourd’hui, et pour quoi&nbsp;?',
        'Qu’est-ce qui a été plus simple qu’il n’y paraissait ce matin&nbsp;?',
        'Quelle chose chez vous vous facilite la vie&nbsp;?',
        'Qu’attendez-vous avec plaisir demain&nbsp;?',
      ],
      cta: 'Répondez à une question par jour',
    },
    why: {
      cover: { kicker: 'Journal de gratitude', title: 'Pourquoi noter ce pour quoi vous êtes reconnaissant', sub: '4 raisons. Sans promesses miracles.' },
      points: [
        { title: 'Vous apprenez à voir le positif', text: 'Quand vous savez que vous noterez quelque chose le soir, vous repérez plus facilement les bons moments de la journée.' },
        { title: 'Une mauvaise journée n’est pas toute mauvaise', text: 'Même un jour difficile cache souvent une petite chose. Cela change la perspective.' },
        { title: 'Une minute, c’est facile', text: 'Trois phrases courtes. Si peu qu’il est difficile de trouver une excuse.' },
        { title: 'De quoi y revenir', text: 'Après un mois, vous avez vos propres archives de bons moments. Parfait pour les jours plus durs.' },
      ],
      cta: 'Essayez pendant 7 jours',
    },
    start: {
      cover: { kicker: 'Mode d’emploi', title: 'Commencer un journal de gratitude en&nbsp;1&nbsp;minute', sub: '3 étapes dans l’app Gratitude.' },
      steps: [
        'Ouvrez la note du jour sur l’écran «&nbsp;Aujourd’hui&nbsp;»',
        'Écrivez 3 petites choses. Ajoutez une photo ou votre voix',
        'Revenez chaque jour et regardez votre série grandir',
      ],
      cta: 'Votre première note vous attend',
    },
    week: {
      cover: { kicker: 'Journal de gratitude', title: 'Ma semaine de gratitude', sub: '7 jours, une petite chose par jour.' },
      days: [
        'Pour le café au calme avant que tout le monde se lève.',
        'Pour le collègue qui m’a aidé sur mon projet sans que je demande.',
        'Pour la balade sous la pluie sans parapluie. C’était drôle.',
        'Pour l’appel de ma sœur, juste comme ça.',
        'Pour le bus qui, cette fois, m’a attendu.',
        'Pour le long petit-déjeuner en famille.',
        'Pour le calme, un bon livre et un plaid bien chaud.',
      ],
      cta: 'À quoi ressemblerait votre semaine&nbsp;?',
    },
  },

  tiktok: {
    three: {
      cover: { kicker: 'Journal de gratitude', title: '3 choses pour lesquelles je suis reconnaissant aujourd’hui', sub: 'Une minute par jour. Essayez avec moi.' },
      labels: ['Première', 'Deuxième', 'Troisième'],
      items: ['Pour le café du matin au calme.', 'Pour la balade avec le chien au parc.', 'Pour l’appel de ma sœur, juste comme ça.'],
      cta: 'Et vous&nbsp;? Écrivez une chose en commentaire',
    },
    questions: {
      cover: { kicker: 'Pour ce soir', title: '5 questions quand vous ne savez pas de quoi être reconnaissant', sub: 'Enregistrez-les, elles serviront ce soir.' },
      cta: 'Répondez à une question par jour',
    },
    solo: {
      cover: { kicker: 'Après le travail', title: 'J’ai créé seul une app de journal de gratitude', sub: 'Voici ce qu’elle contient.' },
      points: [
        { title: 'Une minute par jour', text: 'Vous notez 3 petites choses. En texte, en photo ou à voix haute.' },
        { title: 'Rien que pour vous', text: 'Fonctionne hors ligne, et vos notes se verrouillent par empreinte. Personne ne les lit.' },
        { title: 'Vous voyez vos progrès', text: 'Votre série, la courbe de votre humeur et ce qui vous rend le plus souvent reconnaissant.' },
        { title: 'Gratuit', text: 'Toutes les fonctions sans frais. 7 langues. Sans inscription.' },
      ],
      cta: 'Dites-moi ce que vous en pensez',
    },
    challenge: {
      cover: { kicker: 'Défi', title: '30 jours de gratitude', sub: 'Vous commencez avec moi&nbsp;?' },
      rules: {
        kicker: 'Règles', title: 'Simple comme une minute',
        items: [
          'Chaque jour, notez 3 choses pour lesquelles vous êtes reconnaissant.',
          'Ne vous répétez pas. Cherchez de nouvelles petites choses.',
          'Cochez le jour dans le calendrier de la diapositive suivante.',
        ],
      },
      grid: { kicker: 'Votre calendrier', title: 'Faites une capture et cochez les jours', sub: 'Revenez dans 30 jours et racontez-nous ce qui a changé.' },
      cta: 'Le jour 1 commence aujourd’hui',
    },
  },

  facebook: {
    launch: { kicker: 'Nouveau sur Google Play', title: 'Après le travail, j’ai créé une app de journal de gratitude',
      sub: 'Une minute par jour pour ce qui va bien. Fonctionne hors ligne, et vos notes se verrouillent par empreinte.' },
    group: { kicker: 'Pour ce soir', title: '3 questions quand vous ne savez pas quoi écrire dans votre journal',
      items: ['Quelle petite chose s’est bien passée aujourd’hui&nbsp;?', 'Qui a fait quelque chose de gentil pour moi&nbsp;?', 'Qu’est-ce qui m’a fait rire aujourd’hui&nbsp;?'] },
    feedback: { kicker: 'Je cherche des avis', title: 'Votre avis sincère m’aidera beaucoup',
      sub: 'Installez-la, utilisez-la une semaine et dites-moi ce qui marche et ce qui ne marche pas. Chaque remarque compte.' },
    challenge: { kicker: 'Défi', title: '30 jours de gratitude. Qui en est&nbsp;?',
      sub: '3 petites choses par jour. Au bout d’un mois, une courbe vous montre l’évolution de votre humeur.' },
    thanks: { kicker: 'Merci', title: 'Merci pour les premiers téléchargements et avis&nbsp;!',
      sub: 'Chaque avis sur Google Play aide une petite app à toucher plus de monde. Si vous avez un instant, laissez le vôtre. Cela me ferait très plaisir.' },
  },

  linkedin: {
    launch: { kicker: 'Ma première app', title: 'De l’idée à Google Play – après le travail, en&nbsp;solo',
      sub: 'Un journal de gratitude pour Android. Design, code, 7 langues et un test fermé avec 12 testeurs.' },
    test: {
      cover: { kicker: 'Un guide pour les créateurs d’apps', title: 'Comment j’ai réussi le test fermé de Google Play', sub: '12 testeurs, 14 jours et 5 choses à savoir avant.' },
      points: [
        { title: '12 testeurs pendant 14 jours', text: 'Un nouveau compte développeur personnel ne peut rien publier sans test fermé. Les testeurs doivent rester inscrits 14 jours d’affilée.' },
        { title: 'Des testeurs via un groupe Google', text: 'Un groupe au lieu d’une liste d’e-mails. Autorisez tout le monde à rejoindre, sinon vous validez chaque personne à la main.' },
        { title: 'Les amis ne suffisent pas', text: 'La plupart de mes testeurs viennent d’échanges avec d’autres créateurs&nbsp;: je teste leurs apps, ils testent la mienne.' },
        { title: 'Les testeurs aident vraiment', text: 'Pendant le test, j’ai publié 4 mises à jour, de 1.0.2 à 1.0.5, grâce à leurs retours.' },
        { title: 'Surveillez le compteur', text: 'Si le nombre de testeurs passe sous 12, le décompte peut repartir de zéro. Vérifiez-le tous les quelques jours.' },
      ],
      cta: { title: 'Accès à la production validé en&nbsp;2&nbsp;jours', sub: 'Des questions sur la publication sur Google Play&nbsp;? Posez-les en commentaire.' },
    },
    languages: { kicker: 'Une leçon du projet', title: 'Une app, 7 langues dès le premier jour',
      sub: 'Traductions, fiches du store et captures dans chaque langue. Plus de travail au départ, mais l’app touche tout de suite l’Europe et les Amériques.' },
    work: { kicker: 'Pour le vendredi après-midi', title: '3 questions pour finir la semaine de travail',
      items: ['Qu’est-ce qui s’est bien passé cette semaine&nbsp;?', 'Qui dans mon équipe ai-je envie de remercier&nbsp;?', 'Quelle leçon de cette semaine vais-je garder&nbsp;?'] },
  },
};
