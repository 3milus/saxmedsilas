# Sax Med Silas

Landingpage for saxofonist Silas Steengaard. Bygget som en ren statisk side
(HTML/CSS/JS, ingen build-trin), klar til hosting på GitHub Pages, med en
bookingformular der sender email via FormSubmit.co, og en admin-side
(`admin.html`) bygget på Firebase til statistik og upload af billeder,
video og lyd.

## Struktur

```
index.html            Selve siden
admin.html            Admin-side (login, statistik, upload af medier)
css/style.css         Alt styling (responsivt, farver/former fra logoet)
css/admin.css         Ekstra styling til admin-siden
js/main.js            Mobilmenu, booking-formular, statistik og indlæsning af medier
js/admin.js           Admin-sidens logik
js/firebase.js        Firebase-konfiguration (delt af begge sider)
js/site-texts.js      Læs/skriv de redigerbare tekster (delt af begge sider)
js/own-device.js      Markering af admins' egne enheder (delt af begge sider)
firestore.rules       Sikkerhedsregler for databasen
storage.rules         Sikkerhedsregler for uploadede filer
firebase.json         Peger Firebase CLI på de to regel-filer
assets/               Logo, favicon og placeholder-billeder
```

## 1. Udskift placeholder-indhold

Foto af Silas samt videoer, lydklip og billeder til "Hør & se" uploades på
admin-siden (se afsnit 3). Indtil der er uploadet noget, viser forsiden
pladsholderne.

## 2. Booking-formular (email via FormSubmit)

Formularen sender en email til `silas.sax@live.com` via den gratis tjeneste
[FormSubmit.co](https://formsubmit.co) — ingen konto, server eller nøgler.
Endpointet står øverst i booking-afsnittet i `js/main.js` (`BOOKING_ENDPOINT`).

**Engangsaktivering:**

1. Når siden er online, udfyld og send formularen én gang.
2. FormSubmit sender en aktiverings-email til `silas.sax@live.com`
   (tjek evt. spam). Silas skal trykke **Activate Form**.
3. Herefter modtager Silas alle bookinger som email. Tryk "Svar" i
   mailen for at svare kunden direkte.

Den første test-besked (før aktivering) bliver ikke leveret, og formularen
viser en fejlbesked indtil da.

## 3. Admin-side (Firebase)

`https://saxmedsilas.dk/admin.html` — login, statistik over aktivitet på
siden og upload af billeder, video og lyd. Siden er skjult for søgemaskiner.

**Hvad der gemmes:** Forsiden gemmer én anonym hændelse i Firestore
(`events`) for hver sidevisning, sendt booking-forespørgsel og afspilning
af video/lyd: tidspunkt, side, hvilken hjemmeside besøgende kom fra, og om
det er mobil/tablet/computer. Ingen cookies, IP-adresser eller
personoplysninger – derfor kræves der ikke et cookie-banner.
Besøg fra `localhost` tælles ikke med.

**Egne besøg:** En browser, der har været logget ind på admin-siden, bliver
markeret som "egen enhed" (gemt lokalt i browseren). Besøg derfra gemmes med
`internal: true`, og statistikken kan vise *Besøgende*, *Egne besøg* eller
*Alle*. Markeringen kan slås til/fra under "Denne enhed" på statistik-fanen.
Log ind én gang på hver enhed (pc, telefon), du vil have markeret.

### Opsætning (én gang)

1. **Opret projekt:** Gå til [Firebase Console](https://console.firebase.google.com),
   og opret et projekt (f.eks. "sax-med-silas"). Google Analytics er ikke nødvendigt.
2. **Web-app og konfiguration:** *Project settings > General > Your apps* →
   tilføj en **Web app**. Kopiér værdierne fra `firebaseConfig`, og indsæt dem
   i `js/firebase.js` (erstat alle `TODO_…`-værdier).
3. **Firestore:** *Build > Firestore Database* → *Create database* →
   **production mode**, placering `europe-west` (f.eks. `eur3`).
4. **Login:** *Build > Authentication* → *Get started* → aktivér
   **Email/Password**. Under *Users* → *Add user*: opret Silas' login
   (email + adgangskode).
   - Under *Settings > User actions*: slå **Enable create (sign-up)** fra, så
     ingen andre kan oprette konti.
   - Under *Settings > Authorized domains*: tilføj `saxmedsilas.dk`.
5. **Gør brugeren til admin:** Kopiér brugerens **User UID** fra
   *Authentication > Users*. I Firestore: *Start collection* → Collection ID
   `admins`, Document ID = UID'et, tilføj et felt (f.eks. `name` = `Silas`), gem.
   (Log du ind uden at være admin, viser admin-siden også UID'et.)
6. **Storage (til uploads):** *Build > Storage* → *Get started*.
   Storage kræver, at projektet er på **Blaze**-planen (betal pr. forbrug).
   Den gratis kvote (5 GB lager og 100 GB download pr. måned i regionerne
   `us-central1`/`us-east1`/`us-west1`) dækker en side som denne, men sæt en
   budget-alarm på f.eks. 10 kr. under *Usage and billing*.
   Tip: Lange videoer kan i stedet lægges på YouTube og tilføjes som link –
   det bruger ingen lagerplads.
7. **Sikkerhedsregler:** Kopiér indholdet af `firestore.rules` ind under
   *Firestore Database > Rules* og `storage.rules` ind under *Storage > Rules*,
   og tryk *Publish*. (Eller med Firebase CLI:
   `firebase deploy --only firestore:rules,storage`.) Storage-reglerne slår op
   i Firestore for at tjekke admin – godkend det, når Firebase spørger.

Reglerne sikrer, at alle kan se medierne og tilføje anonyme
statistik-hændelser, men kun admins kan læse statistikken og
uploade/ændre/slette medier.

### Brug

- **Statistik:** sidevisninger, booking-forespørgsler, afspilninger og
  bookinger pr. 100 visninger for de seneste 7, 30 eller 90 dage, samt
  hvor besøgende kommer fra og hvilke enheder de bruger.
- **Billeder, video & lyd:** skift fotoet i "Om Silas", tilføj filer eller
  YouTube-links til "Hør & se", ret titler, ændr rækkefølge og slet.
  Ændringer ses på forsiden ved næste sideindlæsning.
- **Tekster:** ret overskrifter og brødtekster på forsiden. Kun tekster, der
  afviger fra originalen, gemmes (i Firestore `site/texts`); "Nulstil" eller
  et tomt felt bruger den oprindelige tekst fra `index.html`.
  Nye tekster gøres redigerbare ved at give elementet i `index.html` en
  `data-edit="unik-noegle"` og `data-edit-label="Navn i admin"` (brug
  `data-edit-type="paragraphs"` på en `<div>` med flere `<p>`).

## 4. Host på GitHub Pages

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

## 5. Test lokalt

Åbn blot `index.html` i en browser, eller kør en lokal server, f.eks.:

```
npx serve .
```

Test både på en almindelig skærmbredde og på en smal (mobil) bredde —
sitet er bygget mobile-first og bruger flexbox/grid, så det skalerer
automatisk, men det er altid værd at tjekke i en rigtig browser.
