import React from 'react';
import { Pressable, View, TextInput, StyleSheet } from 'react-native';
import SearchIcon from '../assets/icons/search-icon.svg';
import { COLORS } from '../theme/colors';

const SearchBar = ({ placeholder, rightIcon, value, onChangeText, onPressRightIcon }) => {
  return (
    <View style={styles.container}>

      {/* 1. Search Icon */}
      <View style={styles.iconContainer}>
        <SearchIcon width={24} height={24} color={COLORS.primary} />
      </View>

      {/* 2. Text Input */}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ? placeholder : 'Search'}
        placeholderTextColor={COLORS.textSecondary}
      />

      {/* 3. Filter Icon Button */}
      {rightIcon && (
        <Pressable style={styles.filterButton} onPress={onPressRightIcon}>
          {rightIcon}
        </Pressable>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
    padding: 0,
  },
  filterButton: {
    backgroundColor: COLORS.primaryLight,
    padding: 8,
    borderRadius: 10,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SearchBar;