import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { getFoodPhoto } from '../data/foodPhotos';
import { selectMenuItems } from '../redux/menuSlice';
import { restaurantPhotos } from '../data/restaurantPhotos';
import { findDish, restaurant } from '../data/catalog';
import { COLORS } from '../theme/colors';
import { RADIUS } from '../theme/spacing';

export default function FoodThumbnail({ symbol = '🍽️', size = 84, dishId, restaurantId, imageSource }) {
  // Partner photo edits win; otherwise Home can pass its special crop and other screens use the dish photo.
  const dish = useSelector(state => findDish(dishId, selectMenuItems(state))) || findDish(dishId);
  const photo = (dish?.photoUri ? getFoodPhoto(dish) : imageSource) || getFoodPhoto(dish) ||
    (restaurantId === restaurant.id ? restaurantPhotos[restaurant.image] : null);
  return photo ? (
    <Image source={photo} style={[styles.image, { width: size, height: size }]} accessibilityIgnoresInvertColors />
  ) : (
    <View style={[styles.box, { width: size, height: size }]}>
      <Text style={{ fontSize: Math.round(size * 0.32) }}>{symbol}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryLight },
  box: { borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
});
