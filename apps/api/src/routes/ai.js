const express = require('express');
const ai = require('../services/ai');
const chat = require('../services/chat');

const router = express.Router();

router.post('/chat', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim().slice(0, 500) : '';
  if (!Array.isArray(req.body?.menu)) return res.status(400).json({ error: 'A valid menu array is required.' });
  if (!prompt) return res.status(400).json({ error: 'A prompt is required.' });
  try {
    const result = await chat.getChatReply({ menu: req.body.menu, prompt, history: req.body.history });
    return res.json(result);
  } catch (error) {
    console.error('AI chat error:', error.message);
    return res.status(502).json({ error: 'Unable to generate AI recommendations.' });
  }
});

router.post('/recommendations', async (req, res) => {
  const result = await ai.recommendations(req.body?.menu, req.body?.preferences || {});
  res.json(result);
});

module.exports = router;
