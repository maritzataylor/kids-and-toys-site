# Kids & Toys Learning Academy website (PayPal version)

Free hosting on Cloudflare Pages. Payments by PayPal (PayPal accounts or any card).
Paid PDFs unlock only after PayPal confirms payment. Free PDFs unlock after an email signup.
Monthly cost: $0. You pay PayPal's per-sale fee and your yearly domain renewal.

## Files
- `catalog.js` – **the file you edit**: products (3 free + paid), prices, YouTube channel, featured videos, email, FAQ.
- `index.html`, `styles.css`, `app.js` – the site: home, free printables, shop, Videos tab, cart, chatbot.
- `thanks.html` – download page after paying.
- `functions/api/` – server code: PayPal checkout, secure downloads, email signup, newest videos, chatbot, subscriber export.
- `lib/` – shared server helpers. `assets/` – logo, card image, product covers.

## 1. Fill in catalog.js
- Your products: name, price, ages, blurb, and `file` (the PDF's exact file name).
- `youtube`: your channel link. `youtubeChannelId`: open YouTube → your profile → Settings → Advanced settings → Channel ID (starts with UC).
- `FEATURED_VIDEOS`: the 11-character ID from each video link (youtube.com/watch?v=**THIS_PART**).
- `paypalClientId`: see step 4.

## 2. GitHub + Cloudflare Pages
Upload this folder to a new GitHub repository. In Cloudflare: Workers & Pages → Create → Pages → Connect to Git → choose the repo.
Framework: None. Build command: empty. Output directory: `/`. Deploy.

## 3. Storage (both free)
- **R2** → create bucket `kta-downloads` (keep it private). Upload all PDFs, free and paid, named exactly as in catalog.js.
- **D1** → create database `kta-db` (this stores your email list; the table creates itself).

## 4. PayPal
Go to developer.paypal.com, log in with your PayPal **Business** account → Apps & Credentials → Create App.
Start on the **Sandbox** tab (test money). Copy the Client ID into catalog.js. Keep the Secret for step 5.

## 5. Connect it all (Pages project → Settings)
Variables and secrets (mark the secret ones as **Secret**):
- `PAYPAL_CLIENT_ID` = your Client ID
- `PAYPAL_SECRET` = your Secret (secret)
- `PAYPAL_ENV` = `sandbox` for testing, `live` when you go live
- `DOWNLOAD_SECRET` = any long random password (secret) – signs free download links
- `ADMIN_KEY` = another long random password (secret) – lets you download your email list
Bindings:
- R2 bucket → name `DOWNLOADS` → bucket `kta-downloads`
- D1 database → name `DB` → database `kta-db`
- Workers AI → name `AI`
Then Deployments → Retry deployment.

## 6. Test
- Free: click "Get it free", enter an email → the PDF downloads.
- Paid: buy with a sandbox buyer account (developer.paypal.com → Sandbox accounts) → you land on the download page.
- Email list: visit `https://YOURSITE/api/subscribers?key=YOUR_ADMIN_KEY` to download a CSV.

## 7. Go live
Switch PayPal to the **Live** tab, create a live app, put the live Client ID in catalog.js, set `PAYPAL_CLIENT_ID`,
`PAYPAL_SECRET` to the live values and `PAYPAL_ENV` = `live`. Redeploy. Then add your domain under Custom domains.

## Emailing your list
The site collects emails; it doesn't send newsletters. Import the CSV into a free email tool (MailerLite, Brevo and Mailchimp
have free tiers) to send updates. Always include an unsubscribe link (US CAN-SPAM rules). If you get visitors from the EU or UK,
look into their consent rules too.

## Moving from Payhip
Keep Payhip open a few weeks so past buyers can still reach their downloads. You can export your Payhip customer emails,
but only email them if they agreed to marketing.

## Free-tier notes (check current limits; they can change)
Cloudflare Pages + Functions (100,000 requests/day), R2 (10 GB), D1 (5 GB), Workers AI (daily allowance; the chat falls back to
built-in answers if used up). PayPal: no monthly fee, a fee per sale.

## Your full store (updated)
- `catalog.js` now lists 218 products: 14 bundles, 6 $1 deals, 4 free downloads (including the Taste of Everything sampler) and every 20-page pack.
- The shop has category tabs, a search box and cover pictures (all in one image, `assets/covers.jpg`).
- To change a price, edit the `price:` number for that item in `catalog.js`. To move an item to another tab, change its `cats:` list.
- The PayPal Client ID in `catalog.js` is your **sandbox** one. At launch, replace it with your **live** Client ID and set `PAYPAL_ENV` to `live` in Cloudflare.

## Uploading your files to R2
1. Unzip `r2-upload-files.zip` on your computer.
2. In Cloudflare, open R2, then your `kta-downloads` bucket, then Upload.
3. Select every file inside the unzipped folder (PDFs and bundle zips) and drag them in. Don't upload the folder itself, just the files, so the names match `catalog.js` exactly.
