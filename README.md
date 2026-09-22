# Sax Med Silas

Landingpage for saxofonist Silas Steengaard. Bygget som en ren statisk side
(HTML/CSS/JS, ingen build-trin), klar til hosting på GitHub Pages, med en
bookingformular der sender email via FormSubmit.co.

## Struktur

```
index.html          Selve siden
css/style.css        Alt styling (responsivt, farver/former fra logoet)
js/main.js            Mobilmenu + booking-formular (email)
assets/               Logo, favicon og placeholder-billeder
```

## 1. Udskift placeholder-indhold

- **Billeder:** erstat `assets/placeholder-photo.svg` (i `index.html`, "Om
  Silas"-sektionen) med et rigtigt foto af Silas. Erstat de to
  `assets/placeholder-video.svg` i "Hør & se"-sektionen med rigtige
  video/lyd-thumbnails eller indlejrede YouTube/Spotify-embeds.
- **Video/lyd:** Nemmeste løsning er at uploade til YouTube/Spotify og
  indsætte et `<iframe>` embed i stedet for `<img>` i `.media-card`.

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
