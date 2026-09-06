import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { syncApiBaseUrlFromQuery } from './lib/settings.js'
import './index.css'

// Precisa rodar antes de qualquer render — Dashboard já dispara suas
// próprias chamadas à API no primeiro efeito montado, então isso não pode
// esperar por um useEffect de um componente filho.
syncApiBaseUrlFromQuery()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
