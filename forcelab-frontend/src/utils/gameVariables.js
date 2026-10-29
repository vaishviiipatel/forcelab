export const GAME_VARIABLES = {
  'vector-shot': [
    { key: 'gravity', label: 'Gravity' },
    { key: 'density', label: 'Mass' },
    { key: 'friction', label: 'Friction' },
    { key: 'power', label: 'Launch Force' },
  ],
  'sky-stack': [
    { key: 'gravity', label: 'Gravity' },
    { key: 'density', label: 'Block Mass' },
    { key: 'friction', label: 'Friction' },
    { key: 'bounce', label: 'Restitution' },
  ],
  magnetrix: [
    { key: 'gravity', label: 'Gravity' },
    { key: 'mass', label: 'Ball Mass' },
    { key: 'magnet', label: 'Magnetic Strength' },
    { key: 'friction', label: 'Friction' },
  ],
  cascade: [
    { key: 'gravity', label: 'Gravity' },
    { key: 'mass', label: 'Domino Mass' },
    { key: 'friction', label: 'Friction' },
    { key: 'spacing', label: 'Domino Spacing' },
  ],
  impulse: [
    { key: 'mass', label: 'Ball Mass' },
    { key: 'force', label: 'Applied Force' },
    { key: 'contactTime', label: 'Contact Time' },
    { key: 'gravity', label: 'Gravity' },
  ],
  'precision-golf': [
    { key: 'strength', label: 'Shot Strength' },
    { key: 'direction', label: 'Shot Direction' },
    { key: 'friction', label: 'Surface Friction' },
    { key: 'slope', label: 'Ground Slope' },
  ],
}

// 'airTime' -> 'Air Time'
export const toLabel = (key) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())