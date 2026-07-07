# Sax Med Silas

Landingpage for saxofonist Silas Steengaard. Bygget som en ren statisk side
(HTML/CSS/JS, ingen build-trin), klar til hosting på GitHub Pages, med et
Firebase-drevet bookingformular i baggrunden.

## Struktur

```
index.html          Selve siden
css/style.css        Alt styling (responsivt, farver/former fra logoet)
js/main.js            Mobilmenu + Firebase booking-formular
assets/               Logo, favicon og placeholder-billeder
```

## 1. Udskift placeholder-indhold

- **Billeder:** erstat `assets/placeholder-photo.svg` (i `index.html`, "Om
  Silas"-sektionen) med et rigtigt foto af Silas. Erstat de to
  `assets/placeholder-video.svg` i "Hør & se"-sektionen med rigtige
  video/lyd-thumbnails eller indlejrede YouTube/Spotify-embeds.
- **Video/lyd:** Nemmeste løsning er at uploade til YouTube/Spotify og
  indsætte et `<iframe>` embed i stedet for `<img>` i `.media-card`.

## 2. Sæt Firebase op (booking-formular)

Formularen skriver til Firestore og sender automatisk en email til Silas.
Indtil Firebase er sat op, viser formularen blot en besked om at kontakte
Silas direkte på telefon/email — siden fungerer altså fint, selv før dette
trin er udført.

1. Gå til [Firebase Console](https://console.firebase.google.com) og opret
   et nyt projekt (f.eks. "sax-med-silas").
2. Under **Build > Firestore Database**, tryk "Create database" og vælg
   **production mode**.
3. Under **Project settings > General**, tilføj en **Web App**. Kopiér
   `firebaseConfig`-objektet, og indsæt værdierne i `js/main.js` i toppen
   (erstat alle `"TODO_..."`-værdier).
4. Under **Firestore Database > Rules**, indsæt følgende regler, så
   besøgende kun kan *oprette* bookinger, ikke læse/ændre andres:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /bookings/{docId} {
         allow create: if true;
         allow read, update, delete: if false;
       }
       match /mail/{docId} {
         allow create: if true;
         allow read, update, delete: if false;
       }
     }
   }
   ```

5. **Automatisk email:** Opgrader projektet til **Blaze**-planen (pay-as-you-go,
   men gratis kvote dækker langt de fleste hjemmesider). Installér derefter
   den officielle udvidelse **"Trigger Email from Firestore"**
   (`firebase/firestore-send-email`) fra Extensions-markedspladsen i Firebase
   Console:
   - Angiv en SMTP-forbindelse (f.eks. Gmail med app-adgangskode, eller en
     gratis SendGrid/Mailgun-konto).
   - Sæt "Collection path" til `mail` — det er den collection, `js/main.js`
     allerede skriver til.
   - Herefter sender udvidelsen automatisk en email til Silas for hver ny
     booking.
6. Alle bookinger gemmes desuden i `bookings`-collectionen i Firestore, så
   Silas altid kan se den fulde historik i Firebase Console, selv hvis en
   email skulle fejle.

## 3. Host på GitHub Pages

Repoet er allerede forbundet til `https://github.com/3milus/saxmedsilas.git`.

1. Commit og push filerne til `main`-branchen:
   ```
   git add .
   git commit -m "Byg saxmedsilas landingside"
   git push -u origin main
   ```
2. Gå til GitHub-repoet → **Settings > Pages**.
3. Under "Build and deployment", vælg **Deploy from a branch**, branch
   `main`, mappe `/ (root)`.
4. Siden bliver tilgængelig på `https://3milus.github.io/saxmedsilas/`
   (kan tage et par minutter første gang).

## 4. Test lokalt

Åbn blot `index.html` i en browser, eller kør en lokal server, f.eks.:

```
npx serve .
```

Test både på en almindelig skærmbredde og på en smal (mobil) bredde —
sitet er bygget mobile-first og bruger flexbox/grid, så det skalerer
automatisk, men det er altid værd at tjekke i en rigtig browser.
