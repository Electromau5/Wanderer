import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

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
    if (req.method === 'GET') {
      // Fetch itinerary
      const data = await redis.get(ITINERARY_KEY);
      return res.status(200).json(data || { items: [], tripInfo: { title: '', dates: '' }, rawContent: '' });
    }

    if (req.method === 'POST') {
      // Save itinerary
      const { items, tripInfo, rawContent } = req.body;
      await redis.set(ITINERARY_KEY, { items, tripInfo, rawContent });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
