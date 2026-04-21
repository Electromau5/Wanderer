const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (!databaseUrl) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const sql = neon(databaseUrl);

    // Create table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS itinerary (
        id TEXT PRIMARY KEY DEFAULT 'main',
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    if (req.method === 'GET') {
      const result = await sql`SELECT data FROM itinerary WHERE id = 'main'`;
      const data = result[0]?.data || { items: [], tripInfo: { title: '', dates: '' }, rawContent: '' };
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { items, tripInfo, rawContent } = req.body;
      const data = { items, tripInfo, rawContent };

      await sql`
        INSERT INTO itinerary (id, data, updated_at)
        VALUES ('main', ${JSON.stringify(data)}, NOW())
        ON CONFLICT (id)
        DO UPDATE SET data = ${JSON.stringify(data)}, updated_at = NOW()
      `;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
