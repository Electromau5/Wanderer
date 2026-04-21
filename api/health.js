module.exports = function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    time: new Date().toISOString(),
    env: {
      KV_REST_API_URL: !!process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN
    }
  });
};
