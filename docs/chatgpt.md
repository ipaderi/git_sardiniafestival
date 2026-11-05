# SardiniaFestival in ChatGPT

Questa guida descrive il collegamento di SardiniaFestival a ChatGPT tramite il server MCP del portale. Un organizzatore può cercare un comune, consultare le categorie e proporre un evento direttamente nella conversazione. Per inviare la proposta deve collegare il proprio account SardiniaFestival e autorizzare l'accesso.

## Come funziona

1. L'utente collega SardiniaFestival a ChatGPT e accede con il proprio account del portale.
2. Descrive l'evento nella chat; ChatGPT può cercare il comune nell'anagrafica e consultare le categorie disponibili.
3. ChatGPT raccoglie i dati mancanti e presenta un riepilogo. L'utente controlla i dettagli e conferma l'invio.
4. Il portale associa la proposta all'account collegato e la registra **in revisione** (`PENDING`). Non viene pubblicata automaticamente, neanche se l'account è amministratore.
5. La redazione può esaminarla dalla normale area amministrativa. La proposta è visibile all'organizzatore nella dashboard.

Le date, le sedi e gli altri campi sono soggetti alle stesse regole di validazione degli eventi del portale. Per gli eventi itineranti occorrono i dati di ciascuna tappa; per gli eventi online serve il collegamento di partecipazione. Gli orari vanno concordati con l'utente nel fuso `Europe/Rome`; il tool riceve le date in formato ISO UTC. Per gli eventi di tipo giorno singolo, controlla che l'eventuale fine ricada nello stesso giorno: la validazione attuale controlla il numero di appuntamenti, ma non questa condizione. Le traduzioni inglesi degli eventi si possono fornire, ma non vengono generate automaticamente. Il server decide se una proposta è valida: l'assistente non deve inventare informazioni mancanti.

## Prima di collegare ChatGPT

- Configura PostgreSQL e applica le migrazioni del progetto. L'anagrafica dei comuni deve essere presente nel database.
- Configura `AUTH_SECRET`, `AUTH_URL` e `NEXT_PUBLIC_SITE_URL` nell'ambiente del portale. `AUTH_SECRET` deve contenere almeno 32 byte ed essere generato in modo sicuro. In un deploy pubblico gli URL devono puntare al dominio HTTPS effettivo; imposta `NEXT_PUBLIC_SITE_URL` anche al momento della build, come previsto da `compose.yaml`.
- Prepara un account SardiniaFestival attivo e verificato. La verifica dell'email e il recupero password richiedono la configurazione SMTP del portale.
- Pubblica l'app dietro un reverse proxy HTTPS raggiungibile da ChatGPT. Il Compose del progetto espone la porta 3000 alla rete dei container: il proxy deve inoltrare le richieste all'app, conservando anche gli header di autorizzazione. Non occorre installare MinIO nel Compose.
- Configura l'autenticazione OAuth descritta sotto. Mantieni segreti, password e token nelle variabili d'ambiente o nel gestore di segreti del deploy; non inserirli nei file del plugin, negli URL condivisi o nella conversazione.

L'endpoint MCP è:

```text
https://DOMINIO-DEL-PORTALE/api/mcp
```

`localhost` o `127.0.0.1` sul computer dell'organizzatore non sono indirizzi pubblici raggiungibili dal servizio ChatGPT. OpenAI documenta anche [Secure MCP Tunnel](https://developers.openai.com/plugins/deploy/connect-chatgpt) per alcuni test privati; la compatibilità del tunnel con il flusso OAuth specifico di questo progetto non è stata verificata. Per questo collegamento usa un'origine HTTPS pubblica coerente con `NEXT_PUBLIC_SITE_URL`. Il tunnel non sostituisce l'endpoint HTTPS pubblico richiesto per la pubblicazione nel catalogo.

## Autenticazione OAuth

L'integrazione usa OAuth 2.1 con il client ChatGPT ufficiale, authorization code e PKCE S256, e richiede lo scope `events:write`, che autorizza l'invio di proposte di eventi. L'account collegato è quello con cui l'utente accede al portale durante il consenso; non è necessario comunicare a ChatGPT le credenziali del database, dello storage o di OpenAI. Questa configurazione è specifica per il client ChatGPT previsto dal progetto.

Il dominio canonico deve coincidere con `NEXT_PUBLIC_SITE_URL`. Le informazioni di discovery sono esposte dal portale a:

```text
https://DOMINIO-DEL-PORTALE/.well-known/oauth-protected-resource
https://DOMINIO-DEL-PORTALE/.well-known/oauth-authorization-server
```

Il reverse proxy deve inoltrare anche questi percorsi senza riscriverli. I segreti di autenticazione rimangono sul server e devono essere diversi tra ambienti. Per il meccanismo di collegamento e i requisiti dei client consulta la [documentazione OpenAI sull'autenticazione](https://developers.openai.com/plugins/build/auth).

## Collegamento privato in ChatGPT web

La disponibilità dei server MCP personalizzati dipende dal piano, dal workspace e dalle relative impostazioni di sicurezza. Consulta le istruzioni aggiornate di OpenAI in [Connect and test your plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt).

1. Apri ChatGPT sul web e vai a **Plugins**; scegli **Add custom MCP server**. I nomi dei menu possono cambiare.
2. Inserisci un nome riconoscibile, per esempio `SardiniaFestival`, e l'URL HTTPS `/api/mcp` del portale.
3. Completa la configurazione di autenticazione richiesta da ChatGPT, controlla l'avviso relativo ai rischi e crea la connessione.
4. Controlla che siano stati rilevati i tool `search_municipalities`, `list_event_categories` e `submit_event`.
5. Inizia una nuova conversazione, richiama il plugin con `@` e chiedi, per esempio: «Vorrei proporre un concerto a Cagliari». Segui il collegamento per accedere al portale e concedere i permessi richiesti.
6. Controlla con attenzione il riepilogo e i dati dell'operazione prima di confermare. Dopo l'invio, verifica nella dashboard che l'evento risulti in revisione.

La conferma mostrata da ChatGPT non sostituisce i controlli del portale: il server verifica identità, permessi e dati prima di salvare. L'utente deve usare il collegamento di accesso, senza scrivere password o token nella chat.

## Gestire o revocare il collegamento

Dalla dashboard del portale, apri **Connessioni** su `/it/dashboard/connessioni` oppure `/en/dashboard/connessioni`. Qui il proprietario dell'account può consultare e revocare i collegamenti concessi. Dopo la revoca occorre autorizzare nuovamente l'accesso per inviare altre proposte con quel collegamento. Gli eventi già inviati restano nel portale e mantengono il loro stato.

La gestione delle connessioni visibili in ChatGPT è separata: revocare il permesso sul portale e rimuovere il plugin dalla propria configurazione ChatGPT sono due operazioni distinte.

## Pubblicazione nel catalogo pubblico

Il collegamento privato non equivale alla pubblicazione nel catalogo. Per rendere il plugin individuabile pubblicamente servono un pacchetto conforme, un endpoint MCP di produzione su HTTPS, verifica dell'identità e del dominio, scansione dei tool e revisione OpenAI. Fra i materiali richiesti figurano sito, assistenza, informativa privacy e termini su HTTPS, un video dimostrativo, casi di prova e, se necessario, un account dedicato ai revisori con dati di esempio. Le credenziali per la revisione vanno fornite separatamente dal pacchetto pubblico.

I requisiti possono cambiare: consulta [Upload and submit your plugin](https://developers.openai.com/plugins/deploy/submission) e [Plugin submission errors](https://developers.openai.com/plugins/deploy/submission-errors) prima di preparare la candidatura. Una volta approvato, il plugin va pubblicato dal portale OpenAI; la sola approvazione non lo rende automaticamente visibile nel catalogo.

## Risoluzione dei problemi

- **ChatGPT non raggiunge il server:** verifica DNS, certificato HTTPS, proxy e URL `/api/mcp`. L'endpoint deve essere raggiungibile dall'esterno o tramite un tunnel supportato.
- **Non compare la richiesta di accesso:** verifica configurazione OAuth, discovery e impostazioni della connessione. Consulta [Authentication](https://developers.openai.com/plugins/build/auth).
- **Accesso riuscito ma invio rifiutato:** verifica stato e verifica email dell'account, permessi concessi e dati dell'evento. Eventuali dettagli diagnostici devono restare nei log server senza token o password.
- **Comune non trovato:** controlla che il seed dei comuni sia stato importato nel database dell'ambiente collegato.
- **Evento non visibile nel catalogo pubblico:** le proposte sono in revisione e compaiono pubblicamente soltanto dopo l'approvazione da parte della redazione.

Il servizio OpenAI deve poter contattare il server; la sola configurazione locale non dimostra che collegamento, OAuth e invio funzionino da ChatGPT. Verifica il flusso completo con un account e dati di prova prima di distribuirlo.
