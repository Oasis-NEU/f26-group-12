import { Link } from 'react-router'
import { FOCUS_RING } from './focusRing.js'

// The app's button, from the Figma "Button" component.
//
// Figma variants -> props:
//   Type: Primary | Secondary  -> variant="primary" | "secondary"
//   State: Disabled            -> disabled
//   State: Hover / Focus       -> hover: and focus-visible: classes (automatic)
//
// Use Primary (Husky red) for the one main action on a page; everything else
// is Secondary.
// Width hugs the label; pass fullWidth for full-width phone buttons.
//
// It renders the right element for the job:
//   <Button onClick={...}>       -> <button>   (does something on this page)
//   <Button to="/caches/new">    -> <Link>, an <a> (goes to another page)
//   <Button href="https://...">  -> <a>        (goes to another site)
// Links can't be disabled, so `disabled` only works on real buttons.

const BASE =
  `inline-flex h-12 items-center justify-center whitespace-nowrap rounded-lg px-5 text-label ${FOCUS_RING}`

const VARIANTS = {
  primary: {
    enabled: 'bg-accent text-text-on-accent hover:bg-accent-pressed',
    disabled: 'cursor-not-allowed bg-bg-subtle text-text-secondary',
  },
  secondary: {
    enabled: 'border border-border-strong bg-bg-surface text-text-primary hover:bg-bg-subtle',
    disabled: 'cursor-not-allowed border border-border-subtle bg-bg-surface text-text-secondary',
  },
}

function Button({
  variant = 'primary',
  to,
  href,
  disabled = false,
  fullWidth = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const colors = VARIANTS[variant] ?? VARIANTS.primary
  const isLink = Boolean(to || href)
  const classes = [
    BASE,
    disabled && !isLink ? colors.disabled : colors.enabled,
    fullWidth ? 'w-full' : '',
    className,
  ].join(' ')

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    )
  }

  return (
    <button type={type} disabled={disabled} className={classes} {...rest}>
      {children}
    </button>
  )
}

export default Button
