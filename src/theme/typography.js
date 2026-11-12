// One type scale for the whole app (system font). Screens either use <AppText variant="...">
// or spread these styles; font sizes outside this scale are reserved for emoji/illustrations.
export const FONT_WEIGHT = { regular: '400', medium: '600', bold: '700' };

export const TYPOGRAPHY = {
  display: { fontSize: 36, fontWeight: FONT_WEIGHT.bold, lineHeight: 44 },
  title: { fontSize: 28, fontWeight: FONT_WEIGHT.bold, lineHeight: 36 },
  heading: { fontSize: 22, fontWeight: FONT_WEIGHT.bold, lineHeight: 30 },
  subheading: { fontSize: 18, fontWeight: FONT_WEIGHT.bold, lineHeight: 25 },
  body: { fontSize: 15, fontWeight: FONT_WEIGHT.regular, lineHeight: 22 },
  small: { fontSize: 13, fontWeight: FONT_WEIGHT.regular, lineHeight: 19 },
  caption: { fontSize: 11, fontWeight: FONT_WEIGHT.regular, lineHeight: 16 },
  button: { fontSize: 15, fontWeight: FONT_WEIGHT.bold, lineHeight: 21 },
};
