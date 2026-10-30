import vsAsset from '../assets/vector-shot.png'
import ssAsset from '../assets/sky-stack.png'
import mxAsset from '../assets/magnetrix.png'
import ccAsset from '../assets/cascade.png'
import ipAsset from '../assets/impulse.png'
import pgAsset from '../assets/precision-golf.png'

export const LAB_GAMES_REGISTRY = [
  {
    id: 'vector-shot',
    title: 'Vector Shot',
    image: vsAsset,
    tagline: 'Master the perfect launch',
    about: 'Launch a projectile to destroy targets using the perfect combination of force and angle. Every shot is a new challenge.',
    concepts: ['Force', 'Gravity', 'Projectile Motion', 'Momentum'],
    controls: ['Drag to aim', 'Release to launch'],
    didYouKnow: "Increasing the launch angle doesn't always increase distance. The right balance between force and angle matters.",
  },
  {
    id: 'sky-stack',
    title: 'Sky Stack',
    image: ssAsset,
    tagline: 'Build higher without falling',
    about: 'Stack blocks as high as you can. Gravity, block mass, friction and restitution decide whether your tower stands or collapses.',
    concepts: ['Gravity', 'Center of Mass', 'Friction', 'Restitution'],
    controls: ['Click to drop a block', 'Stack as high as you can'],
    didYouKnow: 'A wider base makes a tower more stable because it keeps the center of mass over the support.',
  },
  {
    id: 'magnetrix',
    title: 'Magnetrix',
    image: mxAsset,
    tagline: 'Guide objects with magnetic fields',
    about: 'Hold the magnet over the ball, carry it across the barrier and let go so it rolls onto the green target. Magnetic strength, ball mass, gravity and friction decide whether the ball follows you.',
    concepts: ['Magnetic Force', 'Mass', 'Gravity', 'Friction'],
    controls: ['Hold the mouse to switch the magnet on', 'Move the mouse to carry the ball'],
    didYouKnow: 'Opposite poles attract and like poles repel, and the force weakens quickly with distance.',
  },
  {
    id: 'cascade',
    title: 'Cascade',
    image: ccAsset,
    tagline: 'Set off the perfect chain reaction',
    about: 'Place dominoes along the floor, then push the first one. Space them so each falling domino reaches the next, and knock over the orange target at the end.',
    concepts: ['Momentum', 'Friction', 'Gravity', 'Spacing'],
    controls: ['Click the floor to place dominoes', 'Press Push to start the chain'],
    didYouKnow: 'In a collision, momentum is passed from one object to the next, which is how chain reactions keep going.',
  },
  {
    id: 'impulse',
    title: 'Impulse',
    image: ipAsset,
    tagline: 'Control the push',
    about: 'Push a ball for exactly as long as you choose and send a crate sliding onto the target. Force, contact time, mass and gravity decide how far it goes.',
    concepts: ['Impulse', 'Momentum', 'Force and Time', 'Friction'],
    controls: ['Hold to push the ball', 'Release to let go'],
    didYouKnow: 'Impulse is force multiplied by time, and it equals the change in momentum.',
  },
  {
    id: 'precision-golf',
    title: 'Precision Golf',
    image: pgAsset,
    tagline: 'Sink it with precision',
    about: 'Putt across a sloped green. Choose your direction and strength, read the slope, and sink the ball in as few strokes as you can. Each hole appears somewhere new.',
    concepts: ['Force', 'Friction', 'Slope', 'Direction'],
    controls: ['Move the mouse to aim', 'Hold to charge, release to hit'],
    didYouKnow: 'Friction between the ball and the green is what finally brings it to a stop.',
  },
]

export const findGameById = (targetId) => LAB_GAMES_REGISTRY.find((item) => item.id === targetId)
export const fetchGameName = (targetId) => findGameById(targetId)?.title ?? targetId

// ALIAS MAPPINGS - Fixes missing export errors
export const GAMES = LAB_GAMES_REGISTRY
export const getGame = findGameById
export const gameTitle = fetchGameName
