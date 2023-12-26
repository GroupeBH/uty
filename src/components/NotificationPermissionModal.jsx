import React from 'react'
import { IoNotifications } from 'react-icons/io5'

function Modal({
  updateTokenFirebase,
  setGetPermission,
  getTokenFromFirebase,
}) {
  const handleClick = () => {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        getTokenFromFirebase(updateTokenFirebase)
      }
    })
    setGetPermission(false)
  }
  return (
    <div className="flex items-center mx-auto justify-center bg-[rgba(0, 0, 0, 0.5)] top-[100vh] w-[100vw] h-[100vh] z-0 translate-x-[-0%] translate-y-[-100%] absolute">
      <div className="bg-white p-5 rounded-lg z-10 self-center shadow-lg">
        <div className="text-6xl text-primary flex justify-center items-center">
          <IoNotifications />
        </div>
        <div className="flex flex-col justify-center items-center">
          <p className="text-center mb-2">
            {
              'Restez à jour ! Activez les notifications pour les dernières offres, ventes flash et nouveaux messages.'
            }
          </p>
          <div className="flex gap-2">
            <button
              className="bg-secondary p-3 rounded-lg"
              onClick={() => handleClick()}
            >
              Autoriser
            </button>

            <button
              className="text-primary border border-primary border-[1px] p-3 rounded-lg"
              onClick={() => setGetPermission(false)}
            >
              bloquer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Modal
