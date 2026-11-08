import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import {
  navegadorLigado,
  navegadorSuportado,
  permissaoDoNavegador,
  registrarServiceWorker,
} from '@/lib/notificacaoNavegador'

/* Se a pessoa já ligou os avisos, o service worker sobe junto com o app: é ele
   que mostra a notificação no celular. Sem permissão, não há o que registrar. */
if (navegadorSuportado() && (permissaoDoNavegador() === 'granted' || navegadorLigado())) {
  registrarServiceWorker()
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
