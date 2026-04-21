module.exports = function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    time: new Date().toISOString(),
    hasDatabase: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL)
  });
};
