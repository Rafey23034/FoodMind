const express = require('express');
const ai = require('../services/ai');

const router = express.Router();

router.post('/recommendations', async (req, res) => {
  const result = await ai.recommendations(req.body?.menu, req.body?.preferences || {});
  res.json(result);
});

module.exports = router;
