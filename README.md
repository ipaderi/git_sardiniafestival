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

Le segnalazioni pubbliche entrano nello stato `PENDING`. Un amministratore le approva o le rifiuta nella console `/admin/eventi`. La console `/admin/utenti` consente di assegnare ruoli e sospendere account; API e pagine admin verificano il ruolo sul server. Le sessioni hanno durata di 14 giorni.

Le email di verifica richiedono le variabili `SMTP_*` indicate in `.env.example`. Le immagini degli eventi usano uno storage compatibile S3 esterno: configura `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` e, se necessario, `S3_FORCE_PATH_STYLE`. Le credenziali restano sul server; la gallery pubblica serve le immagini attraverso il portale.

## Comuni sardi e URL locali

Il seed `prisma/data/comuni-sardegna.json` contiene i 377 comuni presenti nel database fornito, identificati tramite codice ISTAT e arricchiti con coordinate e provincia. Il file sorgente è distribuito con licenza MIT da Garda Informatica; i dettagli sono in [prisma/data/README.md](prisma/data/README.md). Il seed è idempotente e collega agli identificativi canonici gli eventi già presenti quando il campo città corrisponde al nome di un comune.

Le pagine locali usano URL parlanti: `/citta/cagliari` e `/sagre-a/cagliari`. Gli eventi sono associati ai comuni tramite chiave canonica. La pagina della città mostra tutti gli eventi pubblicati, distinguendo quelli futuri o in corso da quelli passati; la pagina delle sagre mostra gli appuntamenti futuri o in corso. Le pagine prive di eventi hanno `noindex` e non entrano nella sitemap.

## Struttura dei permalink

- `/categorie` raccoglie le categorie e `/categorie/musica` mostra gli eventi della categoria Musica. Le etichette come “Concerti e festival” descrivono la categoria: eventuali sottocategorie avranno un proprio segmento solo quando saranno gestite e filtrate come tali.
- `/eventi` raccoglie gli eventi e `/eventi/[slug]` identifica una scheda. Le ricerche con filtri restano navigabili, indicano `/eventi` come canonical e sono escluse dall'indicizzazione.
- Le pagine di categoria e delle città entrano nella sitemap quando contengono eventi pubblicati; le pagine delle sagre entrano quando hanno appuntamenti futuri o in corso. Gli indirizzi nelle sitemap usano `NEXT_PUBLIC_SITE_URL`, che va impostato al dominio pubblico canonico nell'ambiente di deploy.

In produzione il calendario mostra solo eventi salvati e approvati nel database.

## Deploy con Docker Compose

Configura `.env` con il database PostgreSQL esterno, l'indirizzo pubblico, i segreti di autenticazione e, quando disponibili, le impostazioni SMTP e S3. Esegui `docker compose up -d --build`: il servizio applica le migrazioni e avvia Next.js sulla porta indicata da `PORT` (3000 per impostazione predefinita). PostgreSQL e lo storage S3 sono gestiti esternamente e non vengono creati da Compose. Il caricamento iniziale dei comuni e dell'amministratore si esegue separatamente con i comandi di seed descritti sopra.
