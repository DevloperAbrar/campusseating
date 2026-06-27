import { forwardRef } from 'react'

const Input = forwardRef(({ label, error, required, className = '', ...props }, ref) => (
  <div className="form-group">
    {label && (
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    )}
    <input
      ref={ref}
      className={`input ${error ? 'border-red-400 focus:ring-red-400' : ''} ${className}`}
      {...props}
    />
    {error && <p className="error-text">{error}</p>}
  </div>
))

Input.displayName = 'Input'

export const Select = forwardRef(({ label, error, required, children, className = '', ...props }, ref) => (
  <div className="form-group">
    {label && (
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    )}
    <select
      ref={ref}
      className={`input ${error ? 'border-red-400 focus:ring-red-400' : ''} ${className}`}
      {...props}
    >
      {children}
    </select>
    {error && <p className="error-text">{error}</p>}
  </div>
))

Select.displayName = 'Select'

export const Textarea = forwardRef(({ label, error, required, rows = 3, className = '', ...props }, ref) => (
  <div className="form-group">
    {label && (
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    )}
    <textarea
      ref={ref}
      rows={rows}
      className={`input resize-none ${error ? 'border-red-400 focus:ring-red-400' : ''} ${className}`}
      {...props}
    />
    {error && <p className="error-text">{error}</p>}
  </div>
))

Textarea.displayName = 'Textarea'

export default Input