'use client'

import { motion } from 'framer-motion'
import {
  Microscope,
  Cog,
  Map,
  HelpCircle,
  FlaskConical,
  Network,
  CheckCircle,
  AlertCircle,
  CircleDot,
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'
import { AnalysisResult } from '@/lib/gemini'

interface ResultsDisplayProps {
  results: AnalysisResult
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100)
  const color =
    confidence >= 0.85
      ? 'text-known bg-known/10 border-known/30'
      : confidence >= 0.6
      ? 'text-debated bg-debated/10 border-debated/30'
      : 'text-unknown bg-unknown/10 border-unknown/30'

  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${color}`}>
      {percentage}% confidence
    </span>
  )
}

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <motion.div
      variants={itemVariants}
      className="bg-surface border border-border rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-deep/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && <div className="px-6 pb-6">{children}</div>}
    </motion.div>
  )
}

export default function ResultsDisplay({ results }: ResultsDisplayProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-4xl mx-auto space-y-4"
    >
      {/* Identification Header */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-br from-accent/20 to-unknown/10 border border-accent/30 rounded-2xl p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted mb-1">{results.identification.category}</p>
            <h2 className="text-2xl font-bold text-white mb-2">
              {results.identification.name}
            </h2>
            <p className="text-gray-300">{results.identification.description}</p>
          </div>
          <ConfidenceBadge confidence={results.identification.confidence} />
        </div>
      </motion.div>

      {/* Mechanism */}
      <Section title="How It Works" icon={Cog}>
        <p className="text-gray-300 mb-4">{results.mechanism.explanation}</p>
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted">Key Principles:</p>
          {results.mechanism.keyPrinciples.map((principle, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <p className="text-gray-300">{principle}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Knowledge Map */}
      <Section title="Knowledge Map" icon={Map}>
        <div className="space-y-6">
          {/* Established */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-known" />
              <h4 className="font-medium text-known">Established Science</h4>
            </div>
            <div className="space-y-3 pl-6">
              {results.knowledgeMap.established.map((item, i) => (
                <div key={i} className="bg-known/5 border border-known/20 rounded-lg p-3">
                  <p className="text-gray-300">{item.fact}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <ConfidenceBadge confidence={item.confidence} />
                    {item.source && (
                      <span className="text-xs text-muted">{item.source}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Debated */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-debated" />
              <h4 className="font-medium text-debated">Active Scientific Debate</h4>
            </div>
            <div className="space-y-3 pl-6">
              {results.knowledgeMap.debated.map((item, i) => (
                <div key={i} className="bg-debated/5 border border-debated/20 rounded-lg p-3">
                  <p className="font-medium text-white mb-2">{item.topic}</p>
                  <div className="space-y-1 mb-2">
                    {item.perspectives.map((p, j) => (
                      <p key={j} className="text-sm text-gray-400">
                        • {p}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-debated">{item.whyDebated}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Unknown */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CircleDot className="w-4 h-4 text-unknown" />
              <h4 className="font-medium text-unknown">Edge of Knowledge</h4>
            </div>
            <div className="space-y-3 pl-6">
              {results.knowledgeMap.unknown.map((item, i) => (
                <div key={i} className="bg-unknown/5 border border-unknown/20 rounded-lg p-3">
                  <p className="font-medium text-white mb-2">{item.question}</p>
                  <p className="text-sm text-gray-400 mb-2">{item.whyUnknown}</p>
                  <div className="text-xs text-muted">
                    <span className="text-unknown">Potential approaches: </span>
                    {item.potentialApproaches.join(' • ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visual knowledge gradient bar */}
        <div className="mt-6">
          <div className="knowledge-gradient h-2 rounded-full opacity-60" />
          <div className="flex justify-between mt-2 text-xs text-muted">
            <span>Known</span>
            <span>Debated</span>
            <span>Unknown</span>
          </div>
        </div>
      </Section>

      {/* Research Questions */}
      <Section title="Research Questions" icon={HelpCircle}>
        <div className="space-y-3">
          {results.questions.map((q, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 bg-deep rounded-lg border border-border"
            >
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  q.depth === 'surface'
                    ? 'bg-known/20 text-known'
                    : q.depth === 'intermediate'
                    ? 'bg-debated/20 text-debated'
                    : 'bg-unknown/20 text-unknown'
                }`}
              >
                {q.depth}
              </span>
              <div className="flex-1">
                <p className="text-gray-300">{q.question}</p>
                <p className="text-xs text-muted mt-1">{q.relatedField}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Experiments */}
      <Section title="Experiments You Can Try" icon={FlaskConical}>
        <div className="space-y-4">
          {results.hypotheses.map((h, i) => (
            <div key={i} className="bg-deep rounded-xl p-4 border border-border">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-sm text-accent mb-1">Hypothesis</p>
                  <p className="text-white font-medium">{h.hypothesis}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                    h.experiment.difficulty === 'beginner'
                      ? 'bg-known/20 text-known'
                      : h.experiment.difficulty === 'intermediate'
                      ? 'bg-debated/20 text-debated'
                      : 'bg-unknown/20 text-unknown'
                  }`}
                >
                  {h.experiment.difficulty}
                </span>
              </div>

              <div className="border-t border-border pt-3 mt-3">
                <h5 className="font-medium text-white mb-2">{h.experiment.title}</h5>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted mb-1">Materials:</p>
                    <ul className="text-gray-400 space-y-1">
                      {h.experiment.materials.map((m, j) => (
                        <li key={j}>• {m}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-muted mb-1">Steps:</p>
                    <ol className="text-gray-400 space-y-1">
                      {h.experiment.steps.map((s, j) => (
                        <li key={j}>
                          {j + 1}. {s}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="mt-3 p-2 bg-accent/10 rounded-lg">
                  <p className="text-xs text-muted">Expected Outcome:</p>
                  <p className="text-sm text-gray-300">{h.experiment.expectedOutcome}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Connections */}
      <Section title="Connections to Broader Science" icon={Network}>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.connections.map((c, i) => (
            <div
              key={i}
              className="bg-deep rounded-lg p-4 border border-border hover:border-accent/50 transition-colors"
            >
              <p className="text-accent font-medium mb-1">{c.field}</p>
              <p className="text-sm text-gray-300 mb-2">{c.connection}</p>
              <p className="text-xs text-muted italic">{c.insight}</p>
            </div>
          ))}
        </div>
      </Section>
    </motion.div>
  )
}
