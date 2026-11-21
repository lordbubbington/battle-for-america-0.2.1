export const BUILD38_AD_WORKS_EVENT_ID = 'interrupt-021-ad-works';

export const BUILD38_AD_WORKS_CHOICES = Object.freeze({
  'repeat-spot': Object.freeze({ label: 'Repeat the spot', costM: 2, points: 3 }),
  'adapt-neighbor': Object.freeze({ label: 'Try a new version in the same state', costM: 1, minPoints: -2, maxPoints: 5 }),
  'bank-win': Object.freeze({ label: 'Bank the win', costM: 0, points: 1 }),
});
