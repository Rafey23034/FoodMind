const express = require('express');
const catalog = require('../services/catalog');
const { notFound } = require('../errors');

const router = express.Router();

router.get('/restaurants', async (req, res) => {
  res.json({ restaurants: await catalog.listRestaurants() });
});

router.get('/restaurants/:id', async (req, res) => {
  const restaurant = await catalog.getRestaurant(Number(req.params.id));
  if (!restaurant) throw notFound('Restaurant not found.');
  res.json({ restaurant });
});

router.get('/restaurants/:id/menu', async (req, res) => {
  const restaurant = await catalog.getRestaurant(Number(req.params.id));
  if (!restaurant) throw notFound('Restaurant not found.');
  res.json({ restaurant, items: await catalog.menuFor(restaurant.id) });
});

router.get('/menu-items/:id', async (req, res) => {
  const item = await catalog.getMenuItem(Number(req.params.id));
  if (!item) throw notFound('Menu item not found.');
  res.json({ item });
});

router.get('/cuisines', async (req, res) => {
  res.json({ cuisines: await catalog.cuisines() });
});

router.get('/tags', async (req, res) => {
  res.json({ tags: await catalog.tags() });
});

module.exports = router;
