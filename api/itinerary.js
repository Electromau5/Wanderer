import { Redis } from '@upstash/redis';

const ITINERARY_KEY = 'wanderer:itinerary';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Support both KV_* and UPSTASH_* environment variable names
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      return res.status(500).json({
        error: 'Database not configured',
        hasKvUrl: !!process.env.KV_REST_API_URL,
        hasKvToken: !!process.env.KV_REST_API_TOKEN,
        hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN
      });
    }

    const redis = new Redis({ url, token });

    if (req.method === 'GET') {
      const data = await redis.get(ITINERARY_KEY);
      return res.status(200).json(data || { items: [], tripInfo: { title: '', dates: '' }, rawContent: '' });
    }

    if (req.method === 'POST') {
      const { items, tripInfo, rawContent } = req.body;
      await redis.set(ITINERARY_KEY, { items, tripInfo, rawContent });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
