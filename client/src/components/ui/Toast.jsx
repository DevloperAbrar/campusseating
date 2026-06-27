// Toast is handled by react-hot-toast <Toaster> in App.jsx
// This file exports a pre-configured Toaster component
import { Toaster } from 'react-hot-toast'

export default function Toast() {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      toastOptions={{
        duration: 3500,
        style: {
          background: '#1e3a5f',
          color: '#fff',
          fontSize: '13px',
          borderRadius: '10px',
          padding: '10px 14px',
        },
        success: {
          iconTheme: { primary: '#4ade80', secondary: '#fff' },
        },
        error: {
          style: { background: '#dc2626' },
          iconTheme: { primary: '#fff', secondary: '#dc2626' },
        },
      }}
    />
  )
}