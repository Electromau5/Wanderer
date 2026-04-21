export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    time: new Date().toISOString(),
    hasRedisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
    hasRedisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN
  });
}
