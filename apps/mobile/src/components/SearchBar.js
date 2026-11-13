import React from 'react';
import { Pressable, View, Text, TextInput, StyleSheet } from 'react-native';
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
        accessibilityLabel={placeholder || 'Search'}
        returnKeyType="search"
      />
      {value ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => onChangeText('')} style={styles.clear}>
        <Text style={styles.clearText}>×</Text>
      </Pressable> : null}

      {/* 3. Filter Icon Button */}
      {rightIcon && (
        <Pressable style={styles.filterButton} onPress={onPressRightIcon} accessibilityRole="button" accessibilityLabel="Filters">
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
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
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
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },
  clear: { paddingHorizontal: 6 },
  clearText: { fontSize: 22, lineHeight: 24, color: COLORS.textSecondary, fontWeight: '700' },
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