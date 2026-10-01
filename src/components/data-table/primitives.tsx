/**
 * Design-system swap points.
 *
 * Everything DataTable renders that is not layout lives here: checkbox,
 * toggle button and icons. Replace these with your design system components;
 * keep the props contract and the rest of DataTable stays untouched.
 */
import { memo, useEffect, useRef } from 'react'
import type { ChangeEvent, ComponentProps, MouseEvent } from 'react'

export interface CheckboxProps {
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  'aria-label': string
}

export const Checkbox = memo(function Checkbox({
  indeterminate = false,
  ...props
}: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !props.checked
  }, [indeterminate, props.checked])
  return (
    <input
      ref={ref}
      type="checkbox"
      className="size-4 cursor-pointer disabled:cursor-not-allowed"
      {...props}
    />
  )
})

export interface IconButtonProps extends Omit<
  ComponentProps<'button'>,
  'type' | 'onClick'
> {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
  'aria-label': string
}

export const IconButton = memo(function IconButton(props: IconButtonProps) {
  return (
    <button
      type="button"
      className="inline-flex size-6 items-center justify-center rounded hover:bg-black/5"
      {...props}
    />
  )
})

/** Placeholder icons: plain glyphs, swap for your icon set. */
export function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block transition-transform"
      style={{ transform: expanded ? 'rotate(90deg)' : undefined }}
    >
      ›
    </span>
  )
}

export function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  return (
    <span aria-hidden className={direction ? '' : 'opacity-30'}>
      {direction === 'asc' ? '↑' : direction === 'desc' ? '↓' : '↕'}
    </span>
  )
}

export function DefaultEmptyState() {
  return <div className="p-6 text-center text-sm opacity-60">No results</div>
}

export function DefaultLoadingState() {
  return <div className="p-6 text-center text-sm opacity-60">Loading…</div>
}
