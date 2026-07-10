# Caietul de cinste

Aplicație pentru un grup de prieteni ca să țină evidența cine face cinste cui — cu **sincronizare live** între toate telefoanele (prin Firebase Realtime Database, gratuit, fără card) și **balanțe nete**.

## Pas 1 — Activează Realtime Database (nu Firestore!)

Firestore cere acum un card atașat chiar și pentru planul gratuit. Realtime Database, de obicei, nu cere.

1. Mergi în consola Firebase, proiectul tău
2. Meniul ☰ din stânga → **Build → Realtime Database → Create Database**
3. Alege o locație (orice, ex Europa)
4. La reguli de securitate, alege **Start in test mode**
5. După ce se creează, sus vezi un URL de forma:
   `https://cinste-5e134-default-rtdb.europe-west1.firebasedatabase.app`
6. Copiază acel URL

## Pas 2 — Pune URL-ul în proiect

Deschide `src/firebase.js` și înlocuiește `PUNE_AICI_databaseURL` cu URL-ul copiat mai sus.

## Pas 3 — Rulare locală (opțional)

```bash
npm install
npm run dev
```

## Pas 4 — Deploy pe Vercel

1. Încarcă folderul pe un repo GitHub (`git init`, `git add .`, `git commit`, push).
2. În Vercel: **Add New Project** → alege repo-ul → Framework Preset: **Vite** → Deploy.

## Cum funcționează balanțele

- "Fac cinste" → alegi cui/cui vrei, banii se datorează invers către tine.
- "Dau banii înapoi" → rambursare directă către o persoană; se scade automat din ce îți datora — dacă suma coincide, ajunge la 0 ("achitat ✓").
- Secțiunea "Cine cui datorează, pe scurt" arată balanța netă cu fiecare membru.

## ⚠️ Notă despre securitate

"Test mode" la Realtime Database permite oricui cu URL-ul să citească/scrie, timp de 30 de zile, apoi Firebase blochează automat accesul dacă nu actualizezi regulile. Pentru o aplicație permanentă între prieteni, spune-mi dacă vrei reguli simple de securitate (ex: o parolă de grup) — te ajut să le adaug.
