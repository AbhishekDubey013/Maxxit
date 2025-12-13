# Deploy Admin Dashboard to Vercel

This guide will help you deploy the Maxxit admin dashboard to Vercel as a separate deployment.

## Option 1: Deploy Entire App to Vercel (Recommended)

Since the admin dashboard is part of your Next.js app, you can deploy the entire app to Vercel and access the dashboard at `https://your-app.vercel.app/admin`.

### Steps:

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from your project root**:
   ```bash
   vercel
   ```

4. **Set Environment Variables** in Vercel Dashboard:
   - Go to your project settings → Environment Variables
   - Add the following:
     - `DATABASE_URL` - Your PostgreSQL connection string
     - `ARBITRUM_RPC_URL` - Arbitrum RPC endpoint (e.g., `https://arb1.arbitrum.io/rpc` or your Alchemy/Infura URL)
     - `NEXT_PUBLIC_PRIVY_APP_ID` - If using Privy authentication
     - Any other environment variables your app needs

5. **Access the Dashboard**:
   - Production: `https://your-app.vercel.app/admin`
   - Preview: `https://your-app-git-branch.vercel.app/admin`

## Option 2: Deploy as Separate Vercel Project

If you want a completely separate deployment just for the admin dashboard:

### Steps:

1. **Create a new Vercel project**:
   ```bash
   vercel
   ```
   - When prompted, create a new project
   - Name it something like `maxxit-admin-dashboard`

2. **Link to your repository**:
   - In Vercel dashboard, go to your project
   - Settings → Git → Connect to your repository
   - Or use: `vercel link`

3. **Configure Build Settings**:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Set Environment Variables** (same as Option 1)

5. **Deploy**:
   ```bash
   vercel --prod
   ```

## Environment Variables Required

Make sure to set these in Vercel Dashboard → Settings → Environment Variables:

```
DATABASE_URL=postgresql://user:password@host:port/database
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
# Or use Alchemy/Infura:
# ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

## Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain (e.g., `admin.maxxit.com`)
3. Follow DNS configuration instructions

## Access URLs

After deployment, your admin dashboard will be available at:

- **Production**: `https://your-project.vercel.app/admin`
- **Preview Deployments**: `https://your-project-git-branch.vercel.app/admin`

## Troubleshooting

### Database Connection Issues
- Ensure `DATABASE_URL` is correctly set in Vercel environment variables
- Check that your database allows connections from Vercel's IP ranges
- For Neon/other cloud databases, you may need to allow all IPs or add Vercel IPs

### Wallet Balance Fetching Issues
- Ensure `ARBITRUM_RPC_URL` is set correctly
- If using free public RPC, consider upgrading to Alchemy/Infura for better reliability
- Check Vercel function logs for RPC errors

### Build Errors
- Make sure all dependencies are in `package.json`
- Check that Prisma generates correctly: `npx prisma generate`
- Review build logs in Vercel dashboard

## Quick Deploy Command

```bash
# One-time setup
vercel login
vercel link

# Deploy to production
vercel --prod

# Or deploy preview
vercel
```

## Security Note

⚠️ **Important**: The admin dashboard currently has no authentication. Consider adding:

1. **Vercel Password Protection**:
   - Go to Settings → Deployment Protection
   - Enable Password Protection
   - Set a password

2. **Or add authentication middleware**:
   - Create `pages/admin/_middleware.ts` to check for admin access
   - Use environment variables for admin wallet addresses
   - Implement JWT or session-based auth

## Monitoring

- View logs: Vercel Dashboard → Your Project → Logs
- Monitor API routes: Functions tab
- Check build status: Deployments tab

