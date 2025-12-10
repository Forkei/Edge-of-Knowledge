// Curated list of fascinating topics for "Surprise Me" feature
// Each topic should lead to interesting exploration with genuine frontiers

export interface SurpriseTopic {
  name: string
  category: string
  teaser: string
}

export const SURPRISE_TOPICS: SurpriseTopic[] = [
  // Biology
  { name: "Tardigrade survival mechanisms", category: "Biology", teaser: "How do water bears survive in space?" },
  { name: "Bioluminescence in deep sea organisms", category: "Biology", teaser: "Living light in the abyss" },
  { name: "Octopus intelligence and consciousness", category: "Biology", teaser: "Alien minds on Earth" },
  { name: "Mycorrhizal networks in forests", category: "Biology", teaser: "The wood wide web" },
  { name: "Bird migration navigation", category: "Biology", teaser: "GPS before satellites" },
  { name: "Coral reef symbiosis", category: "Biology", teaser: "Cities built by animals" },
  { name: "Butterfly wing structural coloration", category: "Biology", teaser: "Color without pigment" },
  { name: "Electric eel bioelectrogenesis", category: "Biology", teaser: "Living batteries" },
  { name: "Axolotl limb regeneration", category: "Biology", teaser: "Regrowing body parts" },
  { name: "Venus flytrap action potentials", category: "Biology", teaser: "Plants with reflexes" },

  // Physics
  { name: "Quantum entanglement", category: "Physics", teaser: "Spooky action at a distance" },
  { name: "Dark matter detection methods", category: "Physics", teaser: "Hunting the invisible" },
  { name: "Superconductivity at room temperature", category: "Physics", teaser: "Zero resistance dream" },
  { name: "Ball lightning phenomenon", category: "Physics", teaser: "A mystery still unsolved" },
  { name: "Time crystals", category: "Physics", teaser: "Matter that repeats in time" },
  { name: "Sonoluminescence", category: "Physics", teaser: "Light from sound" },
  { name: "Casimir effect", category: "Physics", teaser: "Force from nothing" },
  { name: "Pilot wave theory", category: "Physics", teaser: "Hidden variables in quantum mechanics" },
  { name: "Neutron star interior", category: "Physics", teaser: "Densest matter in the universe" },

  // Chemistry
  { name: "Origin of chirality in life", category: "Chemistry", teaser: "Why biology chose left" },
  { name: "Metallic hydrogen", category: "Chemistry", teaser: "Jupiter's core secret" },
  { name: "Quasicrystals", category: "Chemistry", teaser: "Forbidden symmetry" },
  { name: "Spider silk protein structure", category: "Chemistry", teaser: "Stronger than steel" },
  { name: "Phosphorescence vs fluorescence", category: "Chemistry", teaser: "Glow in the dark science" },
  { name: "Aerogel materials", category: "Chemistry", teaser: "Frozen smoke" },

  // Earth Science
  { name: "Earthquake prediction", category: "Earth Science", teaser: "Why we still can't forecast" },
  { name: "Sailing stones of Death Valley", category: "Earth Science", teaser: "Rocks that move alone" },
  { name: "Earth's inner core rotation", category: "Earth Science", teaser: "A planet within a planet" },
  { name: "Volcanic lightning", category: "Earth Science", teaser: "Storms from eruptions" },
  { name: "Deep ocean trenches", category: "Earth Science", teaser: "Earth's lowest points" },
  { name: "Permafrost methane release", category: "Earth Science", teaser: "Ancient gas escaping" },

  // Space
  { name: "Fast radio bursts", category: "Space", teaser: "Millisecond cosmic mysteries" },
  { name: "Fermi paradox", category: "Space", teaser: "Where is everybody?" },
  { name: "Magnetars", category: "Space", teaser: "Universe's strongest magnets" },
  { name: "Rogue planets", category: "Space", teaser: "Worlds without stars" },
  { name: "Cosmic web structure", category: "Space", teaser: "Universe's hidden skeleton" },
  { name: "Tabby's star dimming", category: "Space", teaser: "Alien megastructure or dust?" },
  { name: "Black hole information paradox", category: "Space", teaser: "Where does information go?" },

  // Neuroscience
  { name: "Consciousness and anesthesia", category: "Neuroscience", teaser: "Turning off awareness" },
  { name: "Phantom limb sensations", category: "Neuroscience", teaser: "Feeling what isn't there" },
  { name: "Synesthesia brain mechanisms", category: "Neuroscience", teaser: "Hearing colors" },
  { name: "Sleep and memory consolidation", category: "Neuroscience", teaser: "Why we dream" },
  { name: "Placebo effect mechanisms", category: "Neuroscience", teaser: "Mind healing body" },
  { name: "Split-brain experiments", category: "Neuroscience", teaser: "Two minds in one head" },

  // Mathematics & Computing
  { name: "P vs NP problem", category: "Math", teaser: "The million dollar question" },
  { name: "Riemann hypothesis", category: "Math", teaser: "Pattern in the primes" },
  { name: "Quantum computing error correction", category: "Computing", teaser: "Taming quantum noise" },
  { name: "Cellular automata emergence", category: "Math", teaser: "Complexity from simple rules" },
  { name: "Chaos theory and weather", category: "Math", teaser: "The butterfly effect" },
]

export function getRandomTopic(): SurpriseTopic {
  return SURPRISE_TOPICS[Math.floor(Math.random() * SURPRISE_TOPICS.length)]
}

export function getTopicsByCategory(category: string): SurpriseTopic[] {
  return SURPRISE_TOPICS.filter(t => t.category === category)
}

export function getAllCategories(): string[] {
  const categories = new Set(SURPRISE_TOPICS.map(t => t.category))
  return Array.from(categories)
}
