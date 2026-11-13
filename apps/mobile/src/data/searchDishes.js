import creamyChickenPasta from '../assets/Creamy Chicken Pasta.png';
import alfredoPasta from '../assets/alfredo-pasta.png';
import whitePenne from '../assets/white-pene.png';

export const SEARCH_DISHES = [
  {
    id: '1',
    name: 'Creamy Chicken Pasta',
    restaurant: 'Bella Kitchen',
    cuisine: 'Italian',
    type: 'Dishes',
    rating: 4.8,
    reviews: '120+',
    price: 1050,
    image: creamyChickenPasta,
  },
  {
    id: '2',
    name: 'Alfredo Chicken Pasta',
    restaurant: 'Pasta Corner',
    cuisine: 'Italian',
    type: 'Dishes',
    rating: 4.6,
    reviews: '90+',
    price: 1100,
    image: alfredoPasta,
  },
  {
    id: '3',
    name: 'White Sauce Penne',
    restaurant: 'Fork & Flame',
    cuisine: 'Fusion',
    type: 'Dishes',
    rating: 4.5,
    reviews: '64',
    price: 980,
    image: whitePenne,
  },
];
