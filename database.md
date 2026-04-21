# Database Setup Documentation

This document covers the database setup process for Wanderer, including pain points encountered and solutions implemented.

## Final Setup

- **Database**: Neon Postgres (via Vercel Storage integration)
- **Client Library**: `@neondatabase/serverless`
- **Environment Variables**: `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `DATABASE_URL`

---

## Pain Points & Solutions

### 1. Initial Choice: Upstash Redis (KV Store)

**Attempt**: Started with Upstash Redis through Vercel's Storage integration.

**Pain Points**:
- `@vercel/kv` package is deprecated
- Switched to `@upstash/redis` but still had issues
- Environment variables used `KV_*` prefix (e.g., `KV_REST_API_URL`, `KV_REST_API_TOKEN`)

**Solution**: Abandoned Redis in favor of Neon Postgres for simpler setup.

---

### 2. API Routes Not Being Recognized by Vercel

**Symptom**: Accessing `/api/health` or `/api/itinerary` returned the React SPA HTML instead of JSON responses.

**Cause**: Vercel wasn't detecting the `/api` directory as serverless functions when using Vite.

**Attempts**:
1. Added `vercel.json` with rewrites - didn't work
2. Added explicit function configuration - caused deployment errors
3. Removed `vercel.json` entirely - still didn't work

**Solution**: The issue resolved itself after multiple deployments. Vercel eventually detected the API routes correctly. Key indicators of success:
- Deployment logs show `lambdaRuntimeStats: {"nodejs": 2}` (2 functions detected)
- API endpoints return JSON instead of HTML

---

### 3. Module Syntax Conflict (CommonJS vs ES Modules)

**Symptom**:
```
500: INTERNAL_SERVER_ERROR
Code: FUNCTION_INVOCATION_FAILED
```

**Cause**: `package.json` has `"type": "module"` which makes all `.js` files ES modules. But API files were using CommonJS syntax (`require()`, `module.exports`).

**Wrong approach**:
```javascript
// CommonJS - DOES NOT WORK with "type": "module"
const { neon } = require('@neondatabase/serverless');
module.exports = function handler(req, res) { ... };
```

**Correct approach**:
```javascript
// ES Modules - WORKS with "type": "module"
import { neon } from '@neondatabase/serverless';
export default function handler(req, res) { ... }
```

---

### 4. Wrong Production URL

**Symptom**: Visiting `wanderer.vercel.app` showed a completely different app (a location tracking app called "Wanderer Call Out").

**Cause**: The domain `wanderer.vercel.app` was already taken by another project.

**Solution**: Use the actual Vercel deployment URL:
- **Correct URL**: `https://wanderer-sigma-rosy.vercel.app`
- Found via Vercel dashboard or API: check "Domains" section in project settings

---

### 5. Environment Variable Names

**Pain Point**: Different Vercel storage integrations use different environment variable names.

| Integration | Variable Names |
|------------|----------------|
| Vercel KV (Upstash) | `KV_REST_API_URL`, `KV_REST_API_TOKEN` |
| Neon Postgres | `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `DATABASE_URL` |

**Solution**: Check for multiple possible variable names:
```javascript
const databaseUrl = process.env.POSTGRES_URL_NON_POOLING
  || process.env.POSTGRES_URL
  || process.env.DATABASE_URL;
```

---

## Working API Structure

### `/api/health.js`
Simple health check endpoint that verifies database configuration:

```javascript
export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    time: new Date().toISOString(),
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING
    }
  });
}
```

### `/api/itinerary.js`
Main CRUD endpoint for itinerary data:

```javascript
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const sql = neon(process.env.POSTGRES_URL_NON_POOLING);

  // Auto-create table
  await sql`
    CREATE TABLE IF NOT EXISTS itinerary (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // GET: Fetch itinerary
  // POST: Save itinerary
}
```

---

## Setup Checklist for Future Projects

1. **Create Neon Database**:
   - Vercel Dashboard → Storage → Create Database → Neon Postgres
   - Connect to your project

2. **Install Dependencies**:
   ```bash
   npm install @neondatabase/serverless
   ```

3. **Create API Files** (use ES module syntax):
   - `api/health.js` - Health check
   - `api/[endpoint].js` - Your endpoints

4. **Verify Deployment**:
   - Check deployment logs for `lambdaRuntimeStats`
   - Test `/api/health` endpoint returns JSON

5. **Find Your Production URL**:
   - Vercel Dashboard → Project → Settings → Domains
   - Or check the deployment URL in the Deployments tab

---

## Debugging Tips

1. **API returns HTML instead of JSON**: API routes not being detected. Redeploy or check `vercel.json` configuration.

2. **500 FUNCTION_INVOCATION_FAILED**: Check module syntax matches `package.json` type setting.

3. **Database not configured**: Check environment variables in Vercel Dashboard → Settings → Environment Variables.

4. **Add debug logging**: Use `console.log()` in API functions - logs appear in Vercel Functions tab.
