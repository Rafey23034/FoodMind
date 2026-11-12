// SVG files are turned into components by react-native-svg-transformer; everything else goes
// through Expo's Babel transformer. The SVG package looks for Expo's transformer at a path that
// Expo's package "exports" field blocks when npm installs it nested under expo/ (as package-lock does),
// so we resolve it from inside the expo package ourselves.
const path = require('path');
const { createTransformer } = require('react-native-svg-transformer');

const expoDirectory = path.dirname(require.resolve('expo/package.json'));
const expoBabelTransformer = require(require.resolve('@expo/metro-config/babel-transformer', { paths: [expoDirectory] }));

module.exports.transform = createTransformer(expoBabelTransformer);
