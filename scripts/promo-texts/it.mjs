// Testi delle grafiche promozionali – italiano. Impaginazione: scripts/make-carousels.mjs.
export default {
  ui: {
    app: 'Gratitudine – Diario',
    swipe: 'Scorri →',
    answer: 'La tua risposta:',
    step: 'Passo',
    dayPrompt: 'Per cosa sono grato/a oggi?',
    getIt: 'Gratis su Google Play',
    linkBio: 'Link in bio ↑',
    searchPlay: 'Cerca su Google Play: «Gratitudine Diario»',
    liWhere: 'La mia app: «Gratitudine – Diario» su Google Play',
    ctaSub: 'Un minuto al giorno per ciò che è andato bene. Con testo, foto o voce.',
    ctaMeta: 'Android · 7 lingue',
    appMeta: 'Android · 7 lingue · gratis',
    weekdays: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'],
  },

  instagram: {
    questions: {
      cover: { kicker: 'Diario della gratitudine', title: '10 domande per quando non sai cosa scrivere', sub: 'Salva questo post e riprendilo stasera.' },
      items: [
        'Quale piccola cosa è andata bene oggi?',
        'Chi ti ha fatto sorridere oggi?',
        'Cosa ti ha fatto ridere oggi?',
        'Per cosa puoi ringraziare il tuo corpo oggi?',
        'Quale sapore, profumo o suono di oggi vuoi ricordare?',
        'Quale novità ti ha incuriosito oggi?',
        'Chi vuoi ringraziare oggi, e per cosa?',
        'Cosa si è rivelato più semplice di quanto sembrasse stamattina?',
        'Quale cosa in casa ti semplifica la vita?',
        'Cosa aspetti con gioia per domani?',
      ],
      cta: 'Rispondi a una domanda al giorno',
    },
    why: {
      cover: { kicker: 'Diario della gratitudine', title: 'Perché vale la pena scrivere ciò per cui sei grato', sub: '4 motivi. Nessuna promessa miracolosa.' },
      points: [
        { title: 'Impari a notare il bello', text: 'Se sai che la sera scriverai qualcosa, durante il giorno noti più facilmente i momenti belli.' },
        { title: 'Una brutta giornata non è tutta brutta', text: 'Anche in un giorno difficile di solito c’è una piccola cosa. Questo cambia la prospettiva.' },
        { title: 'Un minuto è un’abitudine facile', text: 'Tre frasi brevi. Così poco che è difficile trovare una scusa.' },
        { title: 'Qualcosa a cui tornare', text: 'Dopo un mese hai un tuo archivio di momenti belli. Perfetto per i giorni più duri.' },
      ],
      cta: 'Provalo per 7 giorni',
    },
    start: {
      cover: { kicker: 'Guida', title: 'Come iniziare un diario della gratitudine in&nbsp;1&nbsp;minuto', sub: '3 passi nell’app Gratitudine.' },
      steps: [
        'Apri la nota di oggi nella schermata «Oggi»',
        'Scrivi 3 piccole cose. Aggiungi una foto o registra la voce',
        'Torna ogni giorno e guarda crescere la tua serie',
      ],
      cta: 'La tua prima nota ti aspetta',
    },
    week: {
      cover: { kicker: 'Diario della gratitudine', title: 'La mia settimana di gratitudine', sub: '7 giorni, una piccola cosa al giorno.' },
      days: [
        'Per il caffè in silenzio prima che tutti si svegliassero.',
        'Per il collega che mi ha aiutato col progetto senza che glielo chiedessi.',
        'Per la passeggiata sotto la pioggia senza ombrello. È stato divertente.',
        'Per la telefonata di mia sorella, così, senza motivo.',
        'Per l’autobus che stavolta mi ha aspettato.',
        'Per la lunga colazione con tutta la famiglia.',
        'Per il silenzio, un buon libro e una coperta calda.',
      ],
      cta: 'Come sarebbe la tua settimana?',
    },
  },

  tiktok: {
    three: {
      cover: { kicker: 'Diario della gratitudine', title: '3 cose per cui oggi sono grato', sub: 'Un minuto al giorno. Provaci con me.' },
      labels: ['Prima', 'Seconda', 'Terza'],
      items: ['Per il caffè del mattino in silenzio.', 'Per la passeggiata col cane al parco.', 'Per la telefonata di mia sorella, senza motivo.'],
      cta: 'E tu? Scrivi una cosa nei commenti',
    },
    questions: {
      cover: { kicker: 'Per stasera', title: '5 domande per quando non sai per cosa essere grato', sub: 'Salvale, stasera ti serviranno.' },
      cta: 'Rispondi a una domanda al giorno',
    },
    solo: {
      cover: { kicker: 'Dopo il lavoro', title: 'Ho creato da solo un’app per il diario della gratitudine', sub: 'Ecco cosa contiene.' },
      points: [
        { title: 'Un minuto al giorno', text: 'Annoti 3 piccole cose. Con testo, foto o voce.' },
        { title: 'Solo per te', text: 'Funziona offline e blocchi le note con l’impronta. Nessuno le legge.' },
        { title: 'Vedi i progressi', text: 'La tua serie, il grafico dell’umore e ciò per cui sei grato più spesso.' },
        { title: 'Gratis', text: 'Tutte le funzioni senza costi. 7 lingue. Senza registrazione.' },
      ],
      cta: 'Dimmi cosa ne pensi',
    },
    challenge: {
      cover: { kicker: 'Sfida', title: '30 giorni di gratitudine', sub: 'Inizi con me?' },
      rules: {
        kicker: 'Regole', title: 'Semplice come un minuto',
        items: [
          'Ogni giorno annota 3 cose per cui sei grato.',
          'Non ripeterti. Cerca cose nuove e piccole.',
          'Segna il giorno sul calendario della slide successiva.',
        ],
      },
      grid: { kicker: 'Il tuo calendario', title: 'Fai uno screenshot e segna i giorni', sub: 'Torna tra 30 giorni e raccontaci cosa è cambiato.' },
      cta: 'Il giorno 1 inizia oggi',
    },
  },

  facebook: {
    launch: { kicker: 'Novità su Google Play', title: 'Dopo il lavoro ho creato un’app per il diario della gratitudine',
      sub: 'Un minuto al giorno per ciò che è andato bene. Funziona offline e blocchi le note con l’impronta.' },
    group: { kicker: 'Per stasera', title: '3 domande per quando non sai cosa scrivere nel diario',
      items: ['Quale piccola cosa è andata bene oggi?', 'Chi oggi ha fatto qualcosa di gentile per me?', 'Cosa mi ha fatto ridere oggi?'] },
    feedback: { kicker: 'Cerco opinioni', title: 'La tua opinione sincera mi aiuterà molto',
      sub: 'Installala, usala per una settimana e dimmi cosa funziona e cosa no. Ogni commento conta.' },
    challenge: { kicker: 'Sfida', title: '30 giorni di gratitudine. Chi ci sta?',
      sub: '3 piccole cose al giorno. Dopo un mese un grafico ti mostra come è cambiato il tuo umore.' },
    thanks: { kicker: 'Grazie', title: 'Grazie per le prime installazioni e recensioni!',
      sub: 'Ogni recensione su Google Play aiuta una piccola app a raggiungere più persone. Se hai un momento, lascia la tua. Mi farebbe molto piacere.' },
  },

  linkedin: {
    launch: { kicker: 'La mia prima app', title: 'Dall’idea a Google Play – dopo il lavoro, da&nbsp;solo',
      sub: 'Un diario della gratitudine per Android. Design, codice, 7 lingue e un test chiuso con 12 tester.' },
    test: {
      cover: { kicker: 'Guida per chi crea app', title: 'Come ho superato il test chiuso di Google Play', sub: '12 tester, 14 giorni e 5 cose da sapere prima.' },
      points: [
        { title: '12 tester per 14 giorni', text: 'Un nuovo account sviluppatore personale non può pubblicare senza test chiuso. I tester devono restare iscritti 14 giorni di fila.' },
        { title: 'Tester tramite un Gruppo Google', text: 'Un gruppo invece di una lista di email. Consenti a chiunque di unirsi, altrimenti approvi ogni persona a mano.' },
        { title: 'Gli amici non bastano', text: 'La maggior parte dei tester è arrivata da scambi con altri creatori: io provo le loro app, loro la mia.' },
        { title: 'I tester aiutano davvero', text: 'Durante il test ho pubblicato 4 aggiornamenti, dalla 1.0.2 alla 1.0.5, grazie ai loro commenti.' },
        { title: 'Tieni d’occhio il contatore', text: 'Se i tester scendono sotto 12, il conteggio può ripartire da capo. Controllalo ogni pochi giorni.' },
      ],
      cta: { title: 'Accesso alla produzione approvato in&nbsp;2&nbsp;giorni', sub: 'Domande sulla pubblicazione su Google Play? Scrivile nei commenti.' },
    },
    languages: { kicker: 'Una lezione dal progetto', title: 'Un’app, 7 lingue dal primo giorno',
      sub: 'Traduzioni, schede dello store e screenshot in ogni lingua. Più lavoro all’inizio, ma l’app raggiunge subito persone in tutta Europa e nelle Americhe.' },
    work: { kicker: 'Per il venerdì pomeriggio', title: '3 domande per chiudere la settimana di lavoro',
      items: ['Cosa è andato bene questa settimana?', 'Chi del mio team voglio ringraziare?', 'Quale lezione di questa settimana mi servirà?'] },
  },
};
