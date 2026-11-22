# Calendario dell'Avvento 2026: pubblicazione da Android

## Cosa contiene questa versione
- La grafica, le 24 caselle e le animazioni del progetto precedente sono conservate.
- Il proprietario entra con Firebase Authentication, email/password.
- La destinataria usa Firebase Authentication **anonimo**: non inserisce email/password; la prima volta inserisce un codice privato monouso creato dal proprietario.
- Le sorprese sono leggibili da lei soltanto dopo la mezzanotte italiana dei rispettivi giorni (1–24 dicembre 2026), in base all'orologio del server Firestore.
- Se lei cancella i dati del browser, cambia dispositivo o perde la sessione anonima, devi creare **un nuovo invito**. Conviene revocare dal pannello il vecchio dispositivo quando non viene più usato.

## Prima di cominciare
Il progetto **non contiene** password o UID reali. Non copiare email, password o codici di invito nel repository GitHub pubblico. Le chiavi di configurazione web Firebase (`apiKey`, ecc.) non sono password; le regole Firestore sono fondamentali.

### 1. Firebase Authentication
Nel progetto Firebase attiva **Email/password** e **Anonimo**. Crea soltanto il tuo utente email/password e copia il suo **UID** dalla scheda Utenti.

### 2. Cloud Firestore
Crea un database **Standard**, ID `(default)`, in una località europea, **modalità produzione**. Non attivare la modalità test.

### 3. Configurazione della app web
Nella Console Firebase > Impostazioni progetto > Le tue app > Aggiungi app > Web (`</>`), registra l'app. Copia dal blocco `firebaseConfig` i valori `apiKey`, `authDomain`, `projectId`, `appId` nel file `firebase-config.js`. Imposta anche `UID_ADMIN` con il tuo UID di Firebase Authentication (non la tua email). Non cambiare i nomi delle proprietà.

### 4. Regole Firestore
Apri `firestore.rules` dall'archivio, sostituisci **tutte le occorrenze** di `INCOLLA_UID_ADMIN` con il tuo UID amministratore (senza spazi). In Firebase > Firestore Database > Regole > Modifica regole, sostituisci tutto con il contenuto aggiornato e premi **Pubblica**. Se Firebase segnala un errore, NON usare regole più permissive per aggirarlo; conserva l'errore e fai correggere il file.

### 5. GitHub Pages
Crea un repository **Public** su github.com; carica tutti i file contenuti nello ZIP (non lo ZIP come unico file), nella cartella principale. Non inserire password e codici di invito tra i file. In Settings > Pages: Deploy from a branch > main > root. Il link sarà `https://TUONOME.github.io/NOME-REPOSITORY/`.

In Firebase > Authentication > Impostazioni > Domini autorizzati, aggiungi `TUONOME.github.io` se il dominio non è già presente. **Non** aggiungere il percorso del repository dopo il dominio.

### 6. Prova l'amministratore
Apri il link dal tuo Android, tocca la porta, seleziona "Accesso amministratore" e accedi con l'email e la password dell'utente Firebase. Deve comparire l'ingranaggio. Dal pannello crea un messaggio provvisorio e salvalo. Per provarlo, l'admin può aprire le caselle prima del 1° dicembre.

### 7. Crea un invito per lei
Nel pannello amministratore premi "Genera codice di invito", quindi "Copia codice". Invia privatamente a lei **soltanto** quel codice, non la tua password. È valido circa sei giorni e si usa una volta sola.

Lei apre il sito dall'iPhone con Safari, tocca la porta, poi "Entra come destinataria" e incolla il codice. La prima volta viene autorizzata; ai successivi accessi dallo stesso browser dovrebbe entrare senza inserire altro. Non usare la navigazione privata, che può perdere la sessione.

**Per la prima prova** non invitarla ancora se vuoi mantenere la sorpresa. Puoi testare il procedimento tu con un altro browser/profilo, poi revocare il dispositivo di prova dal pannello e creare un altro codice per lei.

### 8. Verifiche prima di condividere il link
- L'amministratore può creare/modificare le sorprese e vedere l'ingranaggio.
- Una sessione anonima **senza invito valido** non deve poter leggere le caselle né registrare aperture.
- Un invito valido deve funzionare una sola volta.
- Un invito già usato o scaduto deve essere rifiutato.
- L'utente destinataria **non** deve vedere le sorprese future.
- Dal suo account non deve poter scrivere nelle caselle o cambiare i testi.
- Il codice non deve essere presente su GitHub.
- Verifica anche le animazioni su Safari iOS e Chrome Android.

### 9. Se lei cambia telefono
Dal tuo pannello admin crea un nuovo invito e comunica il nuovo codice direttamente alla destinataria. Revoca il vecchio UID in "Dispositivi autorizzati". Questo meccanismo non riconosce la persona fisica: chiunque ottenga per primo un codice valido potrebbe usarlo. Condividi il codice in privato.

## Costi e limiti
Il progetto è pensato per Firebase **Spark** e GitHub Pages gratuito, entro le quote dei servizi. Nessuna funzionalità prevista richiede Cloud Functions o Cloud Storage. Le foto vengono salvate in Firestore come stringhe JPEG ridimensionate; non è previsto il caricamento di video. Per contenuti personali, evita immagini o dati particolarmente sensibili.

## Avvertenza sui test
Questa versione è stata verificata staticamente, ma non è stata eseguita sul tuo progetto Firebase reale. È necessario pubblicare le regole, provare il flusso di invito e verificare accessi e date prima di consegnare il link. Se incontri un errore, conserva il messaggio esatto e non modificare le regole per aprire indiscriminatamente l'accesso.
