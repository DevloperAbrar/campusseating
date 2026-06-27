import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import AppRouter from './router/AppRouter'
import Toast from './components/ui/Toast'
import useStore from './store/index'

export default function App() {
  const { checkAuth } = useStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <BrowserRouter>
      <AppRouter />
      <Toast />
    </BrowserRouter>
  )
}