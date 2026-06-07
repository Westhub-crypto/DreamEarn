# 🚀 DreamEarn – Complete Deployment Guide

## Project Files

```
dreamearn/
├── public/
│   └── index.html        ← Full frontend app
├── server.js             ← Backend (Express + MongoDB + Squad)
├── package.json          ← Node.js dependencies
├── .env.example          ← Copy to .env and fill your keys
├── .gitignore
└── README.md
```

---

## ⚡ STEP 1 – Set Up MongoDB Atlas (Free Database)

1. Go to **https://cloud.mongodb.com** and create a free account
2. Click **"Build a Database"** → Choose **Free (M0 Cluster)**
3. Select any region close to Nigeria (e.g. AWS / Frankfurt)
4. Click **"Create"**
5. Set a **username and password** — save these!
6. Under **"Network Access"** → click **"Add IP Address"** → choose **"Allow Access from Anywhere"** (0.0.0.0/0)
7. Go back to your cluster → click **"Connect"** → **"Drivers"**
8. Copy the connection string — it looks like:
   ```
   mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
9. Replace `yourpassword` with your actual password
10. Add `/dreamearn` before the `?` so it becomes:
    ```
    mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/dreamearn?retryWrites=true&w=majority
    ```
11. **Save this string** — you'll need it in Step 3

---

## ⚡ STEP 2 – Get Your Squad API Keys

1. Go to **https://dashboard.squadco.com** and create/login to your account
2. Complete your business verification
3. Go to **Settings → API Keys**
4. Copy your:
   - **Public Key** (starts with `pk_live_...` or `test_pk_...`)
   - **Secret Key** (starts with `sk_live_...` or `sandbox_sk_...`)
5. For testing, use **Sandbox keys**. Switch to **Live keys** when ready for real money.
6. Set your **Webhook URL** to:
   ```
   https://your-app-name.onrender.com/api/deposits/webhook
   ```

---

## ⚡ STEP 3 – Deploy to Render.com (Free Hosting)

### A. Push code to GitHub first

1. Create a free account at **https://github.com**
2. Create a **New Repository** called `dreamearn`
3. Upload all your files (server.js, package.json, public/index.html, .gitignore)
4. Do **NOT** upload `.env` — keep it secret!

### B. Deploy on Render

1. Go to **https://render.com** and create a free account
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select your `dreamearn` repo
4. Fill in:
   - **Name:** `dreamearn` (this becomes your URL: dreamearn.onrender.com)
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
5. Click **"Advanced"** → **"Add Environment Variable"**
6. Add each variable from the list below:

### C. Environment Variables to Add on Render

| Key | Value |
|-----|-------|
| `MONGO_URI` | Your MongoDB Atlas connection string from Step 1 |
| `JWT_SECRET` | Any long random string (50+ chars) |
| `ADMIN_EMAIL` | `godwinoloja4@gmail.com` |
| `ADMIN_PASSWORD` | `@Westpablo1` |
| `SQUAD_MODE` | `sandbox` (change to `live` when ready) |
| `SQUAD_SANDBOX_PUBLIC_KEY` | Your Squad sandbox public key |
| `SQUAD_SANDBOX_SECRET_KEY` | Your Squad sandbox secret key |
| `SQUAD_LIVE_PUBLIC_KEY` | Your Squad live public key |
| `SQUAD_LIVE_SECRET_KEY` | Your Squad live secret key |
| `BASE_URL` | `https://dreamearn.onrender.com` |
| `PORT` | `3000` |
| `CLIENT_URL` | `https://dreamearn.onrender.com` |

7. Click **"Create Web Service"**
8. Wait 2–3 minutes for deployment
9. Your app is live at: **https://dreamearn.onrender.com**

---

## ⚡ STEP 4 – Add Your Squad Keys Inside the App

Once your app is live:

1. Open your app URL
2. Scroll to the footer → click **"Admin"**
3. Login with:
   - Email: `godwinoloja4@gmail.com`
   - Password: `@Westpablo1`
4. Go to **Admin → ⚙️ Settings tab**
5. Paste your **Squad Public Key** and **Squad Secret Key**
6. Click **Save Keys**

> 🔒 The Secret Key is stored on your server only. It is never exposed to users.

---

## ⚡ STEP 5 – Connect a Custom Domain (Optional)

If you have a domain (e.g. `dreamearn.com.ng`):

1. On Render → your service → **Settings → Custom Domains**
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g. `dreamearn.com.ng`)
4. Render will give you a **CNAME record** to add to your domain's DNS
5. Go to your domain registrar (Namecheap, GoDaddy, etc.)
6. Add the CNAME record they give you
7. Wait 5–30 minutes for DNS to propagate
8. Your app is now live at your custom domain! 🎉

---

## ⚡ STEP 6 – Switch to Live Payments (Real Money)

When you're ready to accept real money:

1. Complete Squad's business verification at **https://dashboard.squadco.com**
2. Get your **Live API keys** from Squad
3. On Render → your service → **Environment** tab
4. Change `SQUAD_MODE` from `sandbox` to `live`
5. Update `SQUAD_LIVE_PUBLIC_KEY` and `SQUAD_LIVE_SECRET_KEY`
6. Click **"Save Changes"** — Render will redeploy automatically

---

## 🔑 Quick Reference – Where to Put Each Key

| Key | Where to Get It | Where to Put It |
|-----|----------------|-----------------|
| MongoDB URI | MongoDB Atlas → Connect → Drivers | Render Environment Variables |
| JWT Secret | Generate randomly | Render Environment Variables |
| Squad Public Key (Sandbox) | Squad Dashboard → Settings → API | Render Env Vars + Admin Panel |
| Squad Secret Key (Sandbox) | Squad Dashboard → Settings → API | Render Environment Variables ONLY |
| Squad Public Key (Live) | Squad Dashboard → Settings → API | Render Env Vars + Admin Panel |
| Squad Secret Key (Live) | Squad Dashboard → Settings → API | Render Environment Variables ONLY |

> ⚠️ **NEVER** share your Secret Key or MongoDB URI with anyone.
> ⚠️ **NEVER** commit your `.env` file to GitHub.

---

## 📱 Admin Panel Access

- **URL:** `https://your-app.onrender.com` → scroll to footer → click "Admin"
- **Email:** `godwinoloja4@gmail.com`
- **Password:** `@Westpablo1`

### What you can do in Admin:
- ✅ View & manage all users
- 💸 Approve or reject withdrawals (Squad sends payment automatically)
- 📋 Add, edit, pause or delete earning tasks
- 💬 View and reply to live support messages
- ⚙️ Configure Squad API keys, withdrawal limits, referral rates
- 📊 View platform stats and deposit records

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| App not loading | Check Render logs → "Logs" tab |
| MongoDB error | Check your MONGO_URI is correct and IP is whitelisted (0.0.0.0/0) |
| Squad payment failing | Verify your Squad keys and webhook URL |
| Admin login not working | Make sure ADMIN_EMAIL and ADMIN_PASSWORD match exactly |
| App sleeping (free tier) | Render free tier sleeps after 15 mins. Upgrade to Starter ($7/mo) to keep it awake |

---

## 💡 Recommended Upgrades (When Ready)

| Service | Free Tier | Paid (Recommended) |
|---------|-----------|-------------------|
| Render | 512MB RAM, sleeps after 15min | $7/mo – Always on |
| MongoDB Atlas | 512MB storage | $9/mo – 2GB+ |
| Custom Domain | - | ~$10/year from Namecheap |

---

## 📞 Support

For deployment help, contact your developer or visit:
- Render docs: https://render.com/docs
- MongoDB Atlas docs: https://www.mongodb.com/docs/atlas
- Squad docs: https://docs.squadco.com
