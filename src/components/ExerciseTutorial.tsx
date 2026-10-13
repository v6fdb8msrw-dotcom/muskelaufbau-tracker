import { BookOpen, PlayCircle } from 'lucide-react'
import { ARM_BALANCE_EXERCISES, EXERCISE_MAP } from '../data/exercises'
import { PLAN_RULES } from '../data/plan'
import { formatDosage, startWeightLabel, videoSearchUrl } from '../domain/training'
import { href } from '../state/router'
import { useStore } from '../state/store'
import type { CardioBlock, PlannedExercise } from '../types'
import { ExerciseFigure } from './ExerciseFigure'
import { Modal, Notice } from './ui'

/** Mini-Tutorial: animierte Figur, drei Kernpunkte, typische Fehler, Kurzvideos. */
export function ExerciseTutorial({ exerciseId, planned, cardio, onClose }: { exerciseId: string; planned?: PlannedExercise; cardio?: CardioBlock; onClose: () => void }) {
  const { settings } = useStore()
  const ex = EXERCISE_MAP[exerciseId]
  if (!ex) return null
  const weaker = settings.arms.weakerSide === 'right' ? 'rechts' : 'links'
  const stronger = weaker === 'links' ? 'rechts' : 'links'
  const cues = ex.cues ?? ex.execution.slice(0, 3)
  return (
    <Modal title={ex.name} onClose={onClose}>
      <div className="tut">
        <div className="tut-figure">
          <ExerciseFigure id={exerciseId} />
        </div>
        {(planned || cardio) && (
          <div className="tut-dose">
            <strong className="num">{planned ? formatDosage(planned) : cardio!.min === cardio!.max ? `${cardio!.min} Minuten` : `${cardio!.min}–${cardio!.max} Minuten`}</strong>
            {planned?.note && <span>{planned.note}</span>}
            {cardio?.note && <span>{cardio.note}</span>}
          </div>
        )}
        {(startWeightLabel(ex) || ex.startWeight?.text) && (
          <div className="tut-start">
            <span className="eyebrow">Zum Start</span>
            <span>
              {startWeightLabel(ex) && <strong>{startWeightLabel(ex)}. </strong>}
              {ex.startWeight?.text}
            </span>
          </div>
        )}
        <ol className="tut-cues">
          {cues.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ol>
        {ex.unilateral && planned?.perSide && (
          <div className="tut-side">
            Immer {weaker} beginnen. {stronger[0].toUpperCase() + stronger.slice(1)} danach mit gleichem Gewicht und gleicher Wiederholungszahl, nicht mehr.
            {settings.program.extraWeakSet && ARM_BALANCE_EXERCISES.includes(ex.id) && ` Ab Woche ${PLAN_RULES.extraWeakSetFromWeek} kommt ein Zusatzsatz nur ${weaker} dazu.`}
          </div>
        )}
        <div className="tut-warn">
          <span className="eyebrow">Typische Fehler</span>
          <span>{ex.mistakes.slice(0, 2).join(' ')}</span>
        </div>
        {ex.later && <Notice>{ex.later}</Notice>}
        {ex.gym && (
          <div className="tut-gym">
            <span className="eyebrow">Später im Gym</span>
            <span>{ex.gym}</span>
          </div>
        )}
        <div className="row-wrap">
          <a className="btn btn-primary" href={videoSearchUrl(ex.video ?? ex.name)} target="_blank" rel="noopener noreferrer">
            <PlayCircle size={16} /> Kurzvideos ansehen
          </a>
          <a className="btn" href={href(`/uebungen/${ex.id}`)} onClick={onClose}>
            <BookOpen size={16} /> Ausführliche Anleitung
          </a>
        </div>
      </div>
    </Modal>
  )
}
