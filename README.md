# SardiniaFestival

Portale eventi per scoprire e condividere festival, concerti, tradizioni, teatro e appuntamenti in Sardegna.

## Stack

- Next.js 16 App Router, TypeScript, Tailwind CSS 4 e componenti accessibili in stile shadcn/ui
- Prisma ORM 7 con PostgreSQL e driver adapter `pg`
- NextAuth v5 con accesso email/password, ruoli USER/ADMIN e sessioni JWT di 14 giorni
- SEO con metadati, Open Graph, sitemap, robots.txt, dati strutturati Event e pagine locali

## Avvio

1. Copia `.env.example` in `.env` e imposta `DATABASE_URL`, `AUTH_SECRET` e `AUTH_URL`.
2. Installa i pacchetti con `npm install`.
3. Genera il client e applica le migrazioni: `npm run db:generate` e `npm run db:migrate:deploy`. Per modifiche locali allo schema usa `npm run db:migrate`; riserva `npm run db:push` agli esperimenti senza migrazioni.
4. Carica i 377 comuni della Sardegna con `npm run db:seed:comuni`. Per caricare i comuni e creare o aggiornare l'account amministratore usando `ADMIN_EMAIL` e `ADMIN_PASSWORD`, esegui `npm run db:seed`.
5. Avvia Next.js con `npm run dev`.

Gli eventi inviati dal wizard entrano nello stato `PENDING`. Un amministratore li approva o li rifiuta nella console `/it/dashboard/admin/events`, da cui si accede alla scheda (`/events/[id]`), alla modifica (`/events/[id]/edit`) e alla creazione (`/events/new`). La console `/it/dashboard/admin/users` consente di assegnare ruoli e sospendere account; API e pagine admin verificano il ruolo sul server. Le sessioni durano 14 giorni e vengono invalidate quando la password viene reimpostata.

Le email di verifica richiedono le variabili `SMTP_*` indicate in `.env.example`. Le immagini degli eventi usano uno storage compatibile S3 esterno: configura `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` e, se necessario, `S3_FORCE_PATH_STYLE`. Le credenziali restano sul server; la gallery pubblica serve le immagini attraverso il portale.

## Comuni sardi e URL locali

Il seed `prisma/data/comuni-sardegna.json` contiene i 377 comuni presenti nel database fornito, identificati tramite codice ISTAT e arricchiti con coordinate e provincia. Il file sorgente è distribuito con licenza MIT da Garda Informatica; i dettagli sono in [prisma/data/README.md](prisma/data/README.md). Il seed è idempotente e collega agli identificativi canonici gli eventi già presenti quando il campo città corrisponde al nome di un comune.

Gli eventi sono associati ai comuni tramite chiave canonica. Le pagine della città e della provincia distinguono gli eventi futuri o in corso da quelli passati. Le pagine città e categoria prive di eventi hanno `noindex` e non entrano nella sitemap; le province elencano anche i comuni e sono indicizzabili.

## Struttura dei permalink

- Tutte le pagine pubbliche usano il prefisso `/it` o `/en`. La lingua iniziale segue la preferenza salvata o il browser; il selettore permette di cambiarla. I testi inglesi degli eventi, delle occorrenze, dei punti di interesse, delle immagini e delle città in evidenza sono facoltativi; quando mancano viene mostrato il testo originale.
- `/it/events` è il catalogo con mappa; `/it/event/[slug]` è la scheda dell'evento.
- `/it/events/category/musica` raggruppa la categoria; le sottocategorie effettivamente associate agli eventi aggiungono un segmento.
- `/it/events/city` è l'indice dei comuni; `/it/events/city/abbasanta` e `/it/events/city/abbasanta/musica` sono i percorsi locali.
- `/it/events/province` è l'indice delle province; `/it/events/province/sassari` raggruppa comuni ed eventi della provincia.
- `/it/auth/login`, `/it/auth/register`, `/it/auth/password-reset`, `/it/dashboard` e `/it/dashboard/crea-evento` gestiscono account ed eventi. Per l'inglese si sostituisce `/it` con `/en`.
- Le pagine di categoria e delle città entrano nella sitemap quando contengono eventi pubblicati. Gli indirizzi nella sitemap usano `NEXT_PUBLIC_SITE_URL`, da impostare al dominio pubblico canonico nell'ambiente di deploy.

## Traduzioni dell'interfaccia

Le stringhe dell'interfaccia e delle email sono nei dizionari JSON sotto `messages/it/` e `messages/en/`, suddivisi per navigazione, pagine pubbliche, categorie, account, amministrazione ed email/API. Le due lingue devono mantenere le stesse chiavi; i valori tra parentesi graffe, come `{name}`, sono parametri da conservare nelle traduzioni. `lib/dictionary.ts` seleziona il dizionario e gestisce le interpolazioni. I contenuti degli eventi inseriti dagli organizzatori rimangono nel database, separati dai testi dell'interfaccia.

In produzione il calendario mostra solo eventi salvati e approvati nel database.

## Deploy con Docker Compose

Configura `.env` con il database PostgreSQL esterno, l'indirizzo pubblico, i segreti di autenticazione e, quando disponibili, le impostazioni SMTP e S3. Il container avvia Next.js sulla porta interna `3000` dopo aver applicato le migrazioni. In Dokploy configura il dominio nella scheda **Domains** dell'app Compose, selezionando il servizio `web` e la porta `3000`; Dokploy gestisce il collegamento a Traefik. Non pubblicare `3000` sull'host con `ports`, perché la porta può essere già usata da Dokploy o da un altro servizio. PostgreSQL e lo storage S3 sono gestiti esternamente e non vengono creati da Compose. Il caricamento iniziale dei comuni e dell'amministratore si esegue separatamente con i comandi di seed descritti sopra.
