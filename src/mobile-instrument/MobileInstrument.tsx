import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  deriveMobileScene,
  getMobileSceneAnnouncement,
  getSceneScrollOwner,
} from './deriveMobileScene'
import type {
  InstrumentScrollOwner,
  MobileInstrumentAttributesInput,
  MobileInstrumentEnvironment,
  MobileInstrumentProps,
  MobileInstrumentSceneProps,
  MobileScene,
} from './types'
import { useViewportLock } from './useViewportLock'

const MOBILE_QUERY = '(max-width: 767px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const STANDALONE_QUERY = '(display-mode: standalone)'

const MobileInstrumentContext = createContext<MobileInstrumentEnvironment | null>(null)

function readMediaQuery(query: string): boolean {
  return typeof window !== 'undefined' && window.matchMedia(query).matches
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => readMediaQuery(query))

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

function isIosStandalone(): boolean {
  if (typeof navigator === 'undefined') return false
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

export function getMobileInstrumentAttributes({
  scene,
  phase,
  theme,
  isMobile,
  standalone,
  reducedMotion,
  sheetOpen,
}: MobileInstrumentAttributesInput) {
  return {
    'data-mobile-scene': scene,
    'data-phase': phase,
    'data-theme': theme,
    'data-mobile': isMobile,
    'data-standalone': standalone,
    'data-reduced-motion': reducedMotion,
    'data-sheet-open': sheetOpen,
    'data-scroll-owner': getSceneScrollOwner(scene, sheetOpen),
  } as const
}

export function MobileInstrument({
  phase,
  theme,
  sheetOpen = false,
  className = '',
  children,
}: MobileInstrumentProps) {
  const scene = deriveMobileScene(phase)
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)
  const standalone = useMediaQuery(STANDALONE_QUERY) || isIosStandalone()

  useViewportLock(isMobile)

  const environment = useMemo<MobileInstrumentEnvironment>(() => ({
    scene,
    isMobile,
    standalone,
    reducedMotion,
    sheetOpen,
  }), [isMobile, reducedMotion, scene, sheetOpen, standalone])

  const attributes = getMobileInstrumentAttributes({
    scene,
    phase,
    theme,
    isMobile,
    standalone,
    reducedMotion,
    sheetOpen,
  })

  return (
    <MobileInstrumentContext.Provider value={environment}>
      <div className={`mobile-instrument ${className}`.trim()} {...attributes}>
        {children}
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {isMobile ? getMobileSceneAnnouncement(scene) : ''}
        </p>
      </div>
    </MobileInstrumentContext.Provider>
  )
}

function includesScene(
  activeWhen: MobileScene | readonly MobileScene[],
  scene: MobileScene,
): boolean {
  return typeof activeWhen === 'string'
    ? activeWhen === scene
    : activeWhen.includes(scene)
}

function resolveScrollOwner(
  owner: MobileInstrumentSceneProps['scrollOwner'],
  scene: MobileScene,
): InstrumentScrollOwner | undefined {
  if (!owner) return undefined
  if (typeof owner === 'string') return owner
  return owner[scene]
}

export function MobileInstrumentScene({
  name,
  activeWhen,
  scrollOwner,
  className = '',
  children,
}: MobileInstrumentSceneProps) {
  const environment = useContext(MobileInstrumentContext)
  if (!environment) {
    throw new Error('MobileInstrumentScene must be rendered inside MobileInstrument.')
  }

  const sceneActive = includesScene(activeWhen, environment.scene)
  const hiddenOnMobile = environment.isMobile && !sceneActive
  const owner = sceneActive
    ? resolveScrollOwner(scrollOwner, environment.scene)
    : undefined

  return (
    <div
      className={`mobile-instrument-scene ${className}`.trim()}
      data-instrument-scene={name}
      data-scene-active={sceneActive}
      data-scroll-owner={owner}
      aria-hidden={hiddenOnMobile || undefined}
      inert={hiddenOnMobile || undefined}
    >
      {children}
    </div>
  )
}
