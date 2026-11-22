# Aggiornamento: più fotografie per casella

Questa versione permette fino a **6 foto per ciascuna delle 24 caselle**.

## ATTENZIONE: ordine obbligatorio
1. In Firebase Console > Firestore Database > Regole, sostituisci le regole attuali con `firestore.rules` di questo ZIP e premi Pubblica. Attendi la conferma di Firebase. **Non cancellare il database né i documenti esistenti.**
2. Su GitHub, nel repository `avvento-2026-x7k2`, aggiorna nella cartella principale SOLO `app.js`, `index.html`, `stile.css`. Non caricare questo ZIP così com'è, né pubblicare immagini personali sul repository.
3. Aggiorna il sito in Chrome e verifica il pannello amministratore. Se risulta la versione vecchia, chiudi e riapri la pagina o ricarica ignorando la cache.

## Uso
Nel pannello amministratore seleziona una casella, scegli "Solo foto" o "Foto e messaggio", seleziona più file nel campo Foto. Puoi aggiungerne altri fino al limite di sei, spostarli con ← → e cancellarli con ×. Premi **Salva modifiche**. La destinataria le sfoglierà con le frecce o trascinando lateralmente la foto su iPhone.

Le fotografie già presenti rimangono leggibili tramite il vecchio formato `/foto/{n}`. Alla prima modifica che cambia la galleria di una casella, vengono migrate nei nuovi documenti `/gallerie/{n}/immagini/{i}`.

Le immagini sono salvate in Firestore come stringhe JPEG e ogni immagine viene ridimensionata dal browser: il piano Spark ha limiti di archiviazione e traffico, pertanto non è adatto a centinaia di fotografie. Non aggiungere foto sensibili. I contenuti rimangono soggetti alle regole di sblocco per giorno.

Questa modifica è stata verificata staticamente. Non sono stati eseguiti test con il tuo account Firebase reale o Safari su iPhone.
