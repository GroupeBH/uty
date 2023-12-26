import { BrowserRouter } from 'react-router-dom'
import './App.css'
import MainRoutes from './routes/MainRoutes'
import { useEffect, useState } from 'react'
// import Loader from './components/Loader'
// import utyLogo from '../src/assets/logo-uty.png'
import { useStore } from './stores/Store'
import _ from 'lodash'

function App() {
  let currentUser = JSON.parse(localStorage.getItem('currentUser'))

  let tokenFirebase = useStore((state) => state.tokenFirebase)
  let updateTokenFirebase = useStore((state) => state.updateTokenFirebase)
  const [getPermission, setGetPermission] = useState(false)

  useEffect(() => {
    if (
      'serviceWorker' in navigator &&
      currentUser?.haveTokenFirebase === 'false'
    ) {
      navigator.serviceWorker.ready.then(() => {
        setTimeout(() => {
          setGetPermission(false)
        }, 15000)
      })
    }
  }, [])

  return (
    <>
      <BrowserRouter>
        {/* {isMatchingURL ? <Sidebar /> : null} */}
        <MainRoutes />
        {getPermission && (
          <NotificationPermissionModal
            updateTokenFirebase={updateTokenFirebase}
            setGetPermission={setGetPermission}
            getTokenFromFirebase={getTokenFromFirebase}
          />
        )}
      </BrowserRouter>
    </>
  )
}

export default App

