import { ArrowLeftRight, Dumbbell, GlassWater, Scale, ShoppingBasket, UtensilsCrossed } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { navigate } from '../state/router'
import type { MealSlot } from '../types'
import { AddFoodDialog } from './AddFoodDialog'
import { DrinkQuick } from './DrinkQuick'
import { useProgram } from './hooks'
import { WeightDialog } from './MeasureDialogs'
import { SyncDialog } from './SyncDialog'
import { Modal } from './ui'

interface FoodOpts {
  date?: string
  recipeId?: string
  planId?: string
  tab?: 'rezept' | 'snack' | 'lebensmittel' | 'produkt' | 'frei' | 'rest'
  meal?: MealSlot
}

interface UiApi {
  openFood: (opts?: FoodOpts) => void
  openDrink: (date?: string) => void
  openWeight: () => void
  openQuick: () => void
  /** iPhone ↔ Mac per AirDrop abgleichen */
  openSync: () => void
}

const UiContext = createContext<UiApi | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [food, setFood] = useState<FoodOpts | null>(null)
  const [drink, setDrink] = useState<{ date?: string } | null>(null)
  const [weight, setWeight] = useState(false)
  const [quick, setQuick] = useState(false)
  const [sync, setSync] = useState(false)

  const openFood = useCallback((opts: FoodOpts = {}) => setFood(opts), [])
  const openDrink = useCallback((date?: string) => setDrink({ date }), [])
  const openWeight = useCallback(() => setWeight(true), [])
  const openQuick = useCallback(() => setQuick(true), [])
  const openSync = useCallback(() => setSync(true), [])
  const api = useMemo(() => ({ openFood, openDrink, openWeight, openQuick, openSync }), [openFood, openDrink, openWeight, openQuick, openSync])

  return (
    <UiContext.Provider value={api}>
      {children}
      {food && <AddFoodDialog onClose={() => setFood(null)} date={food.date} recipeId={food.recipeId} planId={food.planId} initialTab={food.tab} meal={food.meal} />}
      {drink && (
        <Modal title="Getränk eintragen" onClose={() => setDrink(null)}>
          <DrinkQuick date={drink.date} onDone={() => setDrink(null)} />
        </Modal>
      )}
      {weight && <WeightDialog onClose={() => setWeight(false)} />}
      {sync && <SyncDialog onClose={() => setSync(false)} />}
      {quick && (
        <QuickSheet
          onClose={() => setQuick(false)}
          onFood={() => {
            setQuick(false)
            setFood({})
          }}
          onDrink={() => {
            setQuick(false)
            setDrink({})
          }}
          onWeight={() => {
            setQuick(false)
            setWeight(true)
          }}
          onSync={() => {
            setQuick(false)
            setSync(true)
          }}
        />
      )}
    </UiContext.Provider>
  )
}

function QuickSheet({ onClose, onFood, onDrink, onWeight, onSync }: { onClose: () => void; onFood: () => void; onDrink: () => void; onWeight: () => void; onSync: () => void }) {
  const { next } = useProgram()
  const go = (path: string) => {
    onClose()
    navigate(path)
  }
  const items = [
    { icon: <UtensilsCrossed size={20} />, label: 'Essen eintragen', onClick: onFood },
    { icon: <GlassWater size={20} />, label: 'Trinken', onClick: onDrink },
    { icon: <Scale size={20} />, label: 'Gewicht', onClick: onWeight },
    {
      icon: <Dumbbell size={20} />,
      label: next ? 'Training loggen' : 'Training',
      onClick: () => go(next ? `/training/${next.key}` : '/plan'),
    },
    { icon: <ShoppingBasket size={20} />, label: 'Einkauf', onClick: () => go('/rezepte?tab=einkauf') },
    { icon: <ArrowLeftRight size={20} />, label: 'iPhone ↔ Mac', onClick: onSync },
  ]
  return (
    <Modal title="Schnell erfassen" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        {items.map((it) => (
          <button key={it.label} type="button" className="quick-btn" style={{ padding: '18px 6px' }} onClick={it.onClick}>
            <span className="icon-tile dark">{it.icon}</span>
            {it.label}
          </button>
        ))}
      </div>
    </Modal>
  )
}

export function useUi(): UiApi {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi außerhalb von UiProvider')
  return ctx
}
