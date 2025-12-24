# Supabase Setup Guide

This guide will walk you through setting up Supabase authentication and database for One App.

## Prerequisites

- A Google account (for Google OAuth)
- A GitHub account (to sign up for Supabase)

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub
4. Click "New Project"
5. Fill in the details:
   - **Project name**: `one-app` (or whatever you prefer)
   - **Database password**: Generate a strong password (save it somewhere safe)
   - **Region**: Choose closest to you
6. Click "Create new project"
7. Wait 2-3 minutes for the project to be created

---

## Step 2: Set Up Database

1. In your Supabase project dashboard, click the **SQL Editor** icon in the left sidebar
2. Click **"New query"**
3. Copy the entire contents of `supabase-setup.sql` from this repository
4. Paste it into the SQL editor
5. Click **"Run"** or press `Ctrl/Cmd + Enter`
6. You should see "Success. No rows returned"

This creates:
- `games` table with all necessary columns
- Row Level Security (RLS) policies for multi-user data isolation
- Indexes for performance
- Auto-updating timestamps

---

## Step 3: Get Your Supabase Credentials

1. In your Supabase project, click the **Settings** icon (gear) in the left sidebar
2. Click **API** in the settings menu
3. You'll see two important values:
   - **Project URL** (looks like: `https://abc123xyz.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

4. Copy these values - you'll need them in the next step

---

## Step 4: Configure Environment Variables

1. In your project root, create a file called `.env.local` (not `.env.example`)
2. Add your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Replace the values with your actual credentials from Step 3
4. Save the file

**Important:** `.env.local` is in `.gitignore` so your credentials won't be committed to git.

---

## Step 5: Set Up Google OAuth

### Part A: Create Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Click the navigation menu (☰) → **APIs & Services** → **Credentials**
4. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
5. If prompted, configure the OAuth consent screen:
   - **User Type**: External
   - **App name**: One App
   - **User support email**: Your email
   - **Developer contact**: Your email
   - Click **Save and Continue** through the rest (you can skip optional fields)
6. Back at **Create OAuth client ID**:
   - **Application type**: Web application
   - **Name**: One App
   - **Authorized JavaScript origins**: Add your URLs:
     - `http://localhost:3000` (for local development)
     - `https://your-vercel-app.vercel.app` (your production URL)
   - **Authorized redirect URIs**: Add:
     - `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback`
     - (Get this URL from Supabase - see next part)
7. Click **Create**
8. **Save the Client ID and Client Secret** - you'll need them next!

### Part B: Configure Supabase with Google OAuth

1. Go back to your Supabase project
2. Click **Authentication** in the left sidebar
3. Click **Providers**
4. Find **Google** in the list
5. Toggle it **ON**
6. Paste your **Client ID** and **Client Secret** from Google Cloud Console
7. Copy the **Callback URL** shown (looks like `https://xxx.supabase.co/auth/v1/callback`)
8. Go back to Google Cloud Console and verify this URL is in your **Authorized redirect URIs**
9. Click **Save** in Supabase

### Part C: Configure Site URL

1. Still in **Authentication** → **URL Configuration**
2. Set **Site URL** to:
   - For local dev: `http://localhost:3000`
   - For production: `https://your-app.vercel.app`
3. Add **Redirect URLs** (one per line):
   ```
   http://localhost:3000/**
   https://your-app.vercel.app/**
   ```
4. Click **Save**

---

## Step 6: Test Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to `http://localhost:3000`

3. You should see a **"Sign in with Google"** button in the top-right navigation

4. Click it and try logging in with your Google account

5. After successful login:
   - You should see your name/avatar in the top-right
   - You should see a **"Sign Out"** button

6. Go to **Game Analytics** (`/apps/game-analytics`)

7. Try adding a game - it should now save to Supabase!

---

## Step 7: Verify Data in Supabase

1. Go to your Supabase project
2. Click **Table Editor** in the left sidebar
3. Click the **games** table
4. You should see any games you added!

---

## Step 8: Deploy to Vercel

1. Push your code to GitHub (make sure `.env.local` is in `.gitignore`!)

2. Go to [Vercel](https://vercel.com)

3. Import your repository

4. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key

5. Deploy!

6. After deployment, **update Google OAuth**:
   - Go to Google Cloud Console → Credentials
   - Edit your OAuth client
   - Add your Vercel URL to **Authorized JavaScript origins** and **Authorized redirect URIs**

7. **Update Supabase Site URL**:
   - Go to Supabase → Authentication → URL Configuration
   - Set **Site URL** to your Vercel URL
   - Add your Vercel URL to **Redirect URLs**

---

## Migration: Moving LocalStorage Data to Supabase

If you already have data in localStorage:

1. Log in with Google
2. Go to Game Analytics
3. If you have local data, you'll see a **"Migrate Your Data to the Cloud"** banner
4. Click **"Migrate Now"**
5. Your data will be copied to Supabase
6. Refresh the page - you should now see all your games!

---

## Troubleshooting

### "Sign in with Google" button doesn't work

- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in `.env.local`
- Restart your dev server after adding environment variables
- Check browser console for errors

### OAuth redirect error

- Verify the callback URL in Google Cloud Console matches Supabase's callback URL exactly
- Make sure your current URL (localhost or Vercel) is in the **Authorized JavaScript origins**

### Games not saving

- Check that you ran the SQL schema in Step 2
- Verify you're logged in (check for "Sign Out" button)
- Open browser DevTools → Console to see any errors
- Check Supabase → Table Editor → games table to verify data

### "Failed to migrate data"

- Make sure you're logged in
- Check that you don't already have data in Supabase
- Try migrating one game at a time manually

---

## Security Notes

- **Never commit `.env.local`** - it's in `.gitignore` by default
- The **anon key** is safe to expose in client code - it has limited permissions
- Row Level Security (RLS) ensures users can only see their own data
- Your database password is only needed for direct database access (not for the app)

---

## Next Steps

✅ You're all set! Your app now has:
- Google OAuth authentication
- Cloud database storage
- Multi-user support
- Data sync across devices

Enjoy your One App! 🚀
