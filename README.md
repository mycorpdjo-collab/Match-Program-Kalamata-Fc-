# Kalamata FC · Digital Match Programme

A digital match programme for Καλαμάτα Π.Α.Ε. that reads like a printed magazine and turns like a real book.
One issue per match: a countdown, an email gate, then a 3D book with paper that bends as you turn it.
Club staff prepare each issue in `/admin` without touching code.

- **Next.js 14** (App Router) · TypeScript · Tailwind CSS
- **Supabase**: Postgres for issues, sign-ups and page views; Storage for photos and page images; Auth for staff
- **three.js r149**: the 3D book (`lib/book-engine.js`), loaded only after the visitor reaches the gate
- **Vercel** for hosting

---

## 1. Run it on your computer

You need **Node.js 18.18 or newer**.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

With no Supabase keys the site runs in **demo mode**: issue 05 (Καλαμάτα – Παναθηναϊκός) is built in and already open, so you can try the gate and the book right away. Demo sign-ups are not stored.

- See the countdown: http://localhost:3000/?preview=countdown
- Open a page directly: http://localhost:3000/issue/5#page-8
- Archive: http://localhost:3000/archive

## 2. Connect Supabase (real data, sign-ups, admin)

1. Create a free project at https://supabase.com.
2. **SQL Editor → New query**: paste the contents of `supabase/migrations/0001_init.sql` and click **Run**. This creates the tables, the security rules and the public `programme` storage bucket.
3. **Project Settings → API**: copy the Project URL, the `anon` key and the `service_role` key.
4. Copy `.env.example` to `.env.local` and fill them in:
   ```bash
   cp .env.example .env.local
   ```
   Never commit `.env.local`; the `service_role` key gives full database access.
5. Load issue 05:
   ```bash
   npm run seed
   ```
6. Create a staff login: **Authentication → Users → Add user** (email and password, tick "Auto confirm"). Then give that user admin access:
   ```bash
   node scripts/make-admin.mjs staff@kalamatafc.gr
   ```
7. Restart `npm run dev` and sign in at http://localhost:3000/admin.

## 3. Put it on GitHub

```bash
git remote add origin https://github.com/<your-account>/kalamata-match-programme.git
git push -u origin main
```

## 4. Deploy on Vercel

1. https://vercel.com → **Add New → Project** → import the GitHub repository. The defaults are correct (Next.js).
2. **Environment Variables**: add every variable from `.env.local`. Set `NEXT_PUBLIC_SITE_URL` to the final address, e.g. `https://programme.kalamatafc.gr`.
3. **Deploy**.
4. **Custom domain**: Vercel → Project → Settings → Domains → add `programme.kalamatafc.gr`, then create the CNAME record it shows at your DNS provider.
5. In Supabase → Authentication → URL Configuration, set the Site URL to the same address.

## Environment variables

| Name | Needed | What it does |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes (for real data) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public key, used by the admin in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only; reads issues and stores sign-ups |
| `NEXT_PUBLIC_SITE_URL` | yes | Used for share links and social previews |
| `NEXT_PUBLIC_TICKETS_URL` | optional | Target of «Αγορά εισιτηρίων» on the back page |
| `EMAIL_PROVIDER`, `EMAIL_WEBHOOK_URL` | optional | Forwards each sign-up to your email platform (see `lib/email.ts`) |
| `REMOVE_BG_API_KEY` | optional | One-click background removal for cover cut-outs (remove.bg) |

---

## Πώς δημοσιεύω νέο τεύχος (οδηγός προσωπικού)

1. Συνδεθείτε στο **/admin**.
2. Πατήστε **«Αντιγραφή τελευταίου τεύχους»**. Κρατιούνται αποστολή, επιτελείο, ιδιοκτήτης, μεταγραφές, στατιστικά και χορηγοί· τα στοιχεία του αγώνα καθαρίζουν.
3. **Ρυθμίσεις**: αντίπαλος, γήπεδο, αγωνιστική, σέντρα, πότε **ανοίγει** και πότε **λήγει** (ώρα Ελλάδας). Ανεβάστε το σήμα του αντιπάλου (PNG με διάφανο φόντο).
4. **Εξώφυλλο**: τόνος (μαύρο, λευκό ή φωτογραφία), φωτογραφία, γραμμές εξωφύλλου. Για φωτογραφικό εξώφυλλο ανεβάστε και αποκομμένο θέμα, ή πατήστε «Αφαίρεση φόντου».
5. Περάστε από κάθε καρτέλα. Ο αριθμός δίπλα σε κάθε καρτέλα δείχνει πόσα πεδία λείπουν. Τα πεδία με χρυσό περίγραμμα είναι υποχρεωτικά. Οι φωτογραφίες κόβονται αυτόματα στις σωστές αναλογίες.
6. Δεξιά βλέπετε την προεπισκόπηση της σελίδας. Αν εμφανιστεί «Το κείμενο ξεχειλίζει», συντομεύστε το κείμενο.
7. Πατήστε **«Προεπισκόπηση 3D»** για να δείτε το βιβλίο όπως θα το δουν οι φίλαθλοι.
8. Πατήστε **«Δημοσίευση»**. Αν λείπουν πεδία, θα δείτε ποια. Η δημιουργία των σελίδων διαρκεί περίπου ένα λεπτό· μην κλείσετε την καρτέλα.
9. Το τεύχος εμφανίζεται με αντίστροφη μέτρηση μέχρι την ώρα που ανοίγει, και φεύγει από την αρχική σελίδα όταν λήξει. Μετά τη λήξη μένει στο **Αρχείο** (με email, ελεύθερα ή κρυφό, από τις Ρυθμίσεις).
10. Μετά από κάθε αλλαγή σε δημοσιευμένο τεύχος πατήστε **«Ενημέρωση δημοσίευσης»** για να ξαναδημιουργηθούν οι σελίδες.

Οι εγγραφές κάθε τεύχους είναι στο **Εγγραφές** (αναζήτηση, φίλτρο «μόνο με συγκατάθεση», εξαγωγή CSV). Επισκέψεις, μετατροπή και δημοφιλείς σελίδες είναι στο **Στατιστικά επισκέψεων**.

---

## How it works

| Path | What |
|---|---|
| `/` | The current issue: countdown → gate → book, all in place. Returning visitors (cookie) land in the open book. |
| `/issue/[number]#page-N` | A specific issue, deep-linkable to a page |
| `/archive` | Previous issues (search by opponent or season) |
| `/privacy` | Privacy policy (draft — to be confirmed by the club's legal advisor) |
| `/admin` | Staff area |

- **Pages are React components** (`components/pages/Pages.tsx`), 495 × 700 CSS px (A4). The same components draw the 3D textures, the 2D fallback, the screen-reader copy and Reading mode.
- **Pagination is computed** (`lib/paginator.ts`): spreads start on a left page, a filler page is inserted when needed, the total is padded to an even number, and folios and the contents list come from it.
- **Publish** renders every page to an image in the staff member's browser (`html-to-image`) and uploads them to Supabase Storage, so fans download ready-made images. If an issue has no published images (demo mode), the visitor's browser generates them.
- **No WebGL, Save-Data or a lost graphics context** → a 2D viewer with the same toolbar and deep links.
- **Reduced motion** → instant page changes, no camera drift.
- **Access**: the gate is a soft gate (email for access). Marketing consent is optional and unticked, and never a condition of access (GDPR Art. 7(4)).

### Before launch

- **Fonts**: the brand display face and Neue Helvetica are licensed fonts. Until the club supplies web licences that include Greek, the site uses Manrope (display), Fira Sans Extra Condensed (condensed) and Inter (text), bundled locally via `@fontsource`. Swap them in `app/globals.css` and `tailwind.config.ts`.
- **Logos** in `public/brand/` were cut from the brand guide PDF as PNG. Replace them with the official SVG files when available.
- **Privacy text** in `app/privacy/page.tsx` must be confirmed by the club's legal advisor.
- **Rate limiting** is in memory per server instance; move to Upstash/Redis if traffic needs it.
- **Data to confirm** for issue 05: stadium, and the head-to-head goals (the 14 results add up to 8–29).
