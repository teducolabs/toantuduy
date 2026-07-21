import { student } from '@/locales/vi/student'

export type MascotState = 'neutral' | 'happy' | 'gentle'

// Clearance for card content that must not run under the mascot:
// 72px owl + 8px right inset + 8px breathing room.
export const MASCOT_CLEARANCE_CLASS = 'pr-[88px]'

const MASCOT_ASSETS: { state: MascotState; src: string; alt: string }[] = [
  { state: 'neutral', src: '/mascot/cu-neutral.svg', alt: student.mascotNeutralAlt },
  { state: 'happy', src: '/mascot/cu-happy.svg', alt: student.mascotHappyAlt },
  { state: 'gentle', src: '/mascot/cu-gentle.svg', alt: student.mascotGentleAlt },
]

// All three assets render stacked and are toggled by CSS class (UX-DR7
// "class-swap") so the first feedback swap never fetches on a cold cache.
export function Mascot({ state }: { state: MascotState }) {
  return (
    <div data-slot="mascot" className="pointer-events-none absolute bottom-2 right-2 h-[72px] w-[72px]">
      {MASCOT_ASSETS.map((asset) => {
        const active = asset.state === state
        return (
          <img
            key={asset.state}
            src={asset.src}
            alt={active ? asset.alt : ''}
            aria-hidden={active ? undefined : 'true'}
            className={`absolute inset-0 h-full w-full transition-opacity duration-200 ease-in-out motion-reduce:transition-none ${active ? 'opacity-100' : 'opacity-0'}`}
          />
        )
      })}
    </div>
  )
}
