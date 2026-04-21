module.exports = function handler(req, res) {
  try {
    res.status(200).json({
      status: 'ok',
      time: new Date().toISOString(),
      env: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        POSTGRES_URL: !!process.env.POSTGRES_URL,
        POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
