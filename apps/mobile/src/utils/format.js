// Shared text helpers so every screen formats numbers and counts the same way.
export function formatNumber(value) {
  const number = Math.round(Number(value) || 0);
  return String(Math.abs(number)).replace(/\B(?=(\d{3})+(?!\d))/g, ',').replace(/^/, number < 0 ? '-' : '');
}

export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function initials(name, fallback = 'FM') {
  const result = String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return result || fallback;
}
