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
