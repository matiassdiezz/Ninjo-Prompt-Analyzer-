# Deployment Guide - Ninjo Prompt Analyzer

## 🚀 Vercel Deployment (Recommended)

Vercel is the easiest way to deploy this Next.js application.

### Prerequisites
- GitHub account
- Vercel account (free tier works)
- Anthropic API key

### Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   - In Vercel dashboard, go to Project Settings → Environment Variables
   - Add: `ANTHROPIC_API_KEY` = `your_actual_api_key`
   - Make sure it's available for Production, Preview, and Development

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app will be live at `your-project.vercel.app`

5. **Custom Domain (Optional)**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

### Automatic Deployments
- Every push to `main` triggers a production deployment
- Pull requests get preview deployments
- Vercel handles HTTPS automatically

---

## 🐳 Docker Deployment

### Create Dockerfile

Create a file named `Dockerfile` in the project root:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### Build and Run

```bash
# Build the image
docker build -t ninjo-prompt-analyzer .

# Run the container
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=your_key ninjo-prompt-analyzer

# Or with docker-compose
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

---

## ☁️ AWS Deployment

### Using AWS Amplify

1. **Push to GitHub** (same as Vercel)

2. **Create Amplify App**
   - Go to AWS Amplify Console
   - Click "New App" → "Host web app"
   - Connect your GitHub repository
   - Select branch (main)

3. **Configure Build Settings**
   - Amplify auto-detects Next.js
   - Build command: `npm run build`
   - Output directory: `.next`

4. **Add Environment Variable**
   - Go to App Settings → Environment variables
   - Add `ANTHROPIC_API_KEY`

5. **Deploy**
   - Click "Save and Deploy"
   - Your app will be live at `*.amplifyapp.com`

### Using EC2

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t2.small or larger
   - Open port 3000 (or 80/443)

2. **Install Dependencies**
   ```bash
   ssh into your instance
   sudo apt update
   sudo apt install -y nodejs npm
   ```

3. **Clone and Build**
   ```bash
   git clone <your-repo>
   cd Ninjo-Prompt-Analyzer-
   npm install --legacy-peer-deps
   npm run build
   ```

4. **Set Environment Variable**
   ```bash
   echo "ANTHROPIC_API_KEY=your_key" > .env.local
   ```

5. **Run with PM2**
   ```bash
   npm install -g pm2
   pm2 start npm --name "ninjo-analyzer" -- start
   pm2 save
   pm2 startup
   ```

---

## 🌊 DigitalOcean Deployment

### Using App Platform

1. **Create App**
   - Go to DigitalOcean Dashboard
   - Create → Apps
   - Connect your GitHub repository

2. **Configure**
   - Build Command: `npm run build`
   - Run Command: `npm start`
   - Environment Variable: `ANTHROPIC_API_KEY`

3. **Deploy**
   - Click "Create Resources"
   - App will be live at `*.ondigitalocean.app`

---

## 🔧 Netlify Deployment

1. **Push to GitHub**

2. **Create Site**
   - Go to Netlify dashboard
   - New site from Git
   - Select repository

3. **Configure**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Add environment variable: `ANTHROPIC_API_KEY`

4. **Deploy**
   - Netlify will build and deploy
   - Site will be live at `*.netlify.app`

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] ✅ ANTHROPIC_API_KEY is set as environment variable
- [ ] ✅ .env.local is in .gitignore
- [ ] ✅ No API keys in code
- [ ] ✅ HTTPS is enabled
- [ ] ✅ CORS is configured (if needed)
- [ ] 🔲 Rate limiting implemented (optional)
- [ ] 🔲 Error monitoring set up (Sentry, etc.)
- [ ] 🔲 Analytics configured (optional)

---

## 📊 Monitoring

### Vercel Analytics (Built-in)
- Go to Project → Analytics
- View page views, performance, etc.

### Custom Monitoring
Add to your application:

```typescript
// lib/monitoring.ts
export function logError(error: Error) {
  // Send to Sentry, LogRocket, etc.
  console.error('Application error:', error);
}

export function logAnalysis(promptLength: number, imageCount: number) {
  // Track usage metrics
  console.log('Analysis performed:', { promptLength, imageCount });
}
```

---

## 🔄 CI/CD

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install --legacy-peer-deps

      - name: Run build
        run: npm run build
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Deploy
        # Add your deployment script here
```

---

## 🧪 Testing Before Deploy

### Local Production Build
```bash
npm run build
npm start
# Visit http://localhost:3000
```

### Check for Errors
```bash
npm run lint
```

### Test API Route
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test prompt",
    "feedback": []
  }'
```

---

## 📈 Scaling Considerations

### For High Traffic

1. **Rate Limiting**
   - Add rate limiting to `/api/analyze`
   - Use Upstash Redis or similar

2. **Caching**
   - Cache common analyses
   - Use Redis or in-memory cache

3. **Queue System**
   - Use BullMQ or similar
   - Process analyses asynchronously

4. **Load Balancing**
   - Use multiple instances
   - Add load balancer (ALB, nginx)

### Cost Optimization

1. **API Costs**
   - Monitor Anthropic usage
   - Set spending limits
   - Implement caching

2. **Infrastructure**
   - Start with free tiers
   - Scale up as needed
   - Use serverless when possible

---

## 🆘 Troubleshooting

### Build Fails
- Check Node.js version (18+)
- Try `rm -rf node_modules .next && npm install --legacy-peer-deps`
- Check all environment variables are set

### API Errors in Production
- Verify ANTHROPIC_API_KEY is set correctly
- Check API key has credits
- Check network connectivity
- Review server logs

### Performance Issues
- Enable compression
- Optimize images further
- Add CDN (Vercel does this automatically)
- Check bundle size

---

## ✅ Post-Deployment

After deploying:

1. Test the live site thoroughly
2. Monitor error rates
3. Check API usage and costs
4. Set up alerts for downtime
5. Document your deployment process
6. Share the URL with your team

---

## 🎯 Recommended Setup

For most users:

**Development**: `npm run dev` locally

**Production**: Vercel deployment
- Easiest setup
- Automatic HTTPS
- Great performance
- Free tier available
- Automatic deployments

**Cost**: $0/month (Vercel free tier + Anthropic API usage only)

---

Need help? Check the main [README.md](./README.md) or open an issue!
