import { Loader2 } from 'lucide-react'
import { forwardRef } from 'react'

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
}

const sizes = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
}

const Button = forwardRef(
  ({ children, variant = 'primary', size = 'md', icon: Icon, loading = false, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`btn ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : Icon ? (
          <Icon size={14} />
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button