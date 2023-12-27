import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig)
//Access Firebase cloud messaging
const messaging = getMessaging(firebaseApp)

/*
This function allows us to get your device token from Firebase 
which is required for sending Push notifications to your device.
*/

export const getTokenFromFirebase = (updateTokenFirebase) => {
  return getToken(messaging)
    .then((currentToken) => {
      if (currentToken) {
        updateTokenFirebase(currentToken)
        console.log('current token for client: ', currentToken)
      } else {
        console.log(
          'No registration token available. Request permission to generate one.'
        )
      }
    })
    .catch((err) => {
      console.log('An error occurred while retrieving token. ', err)
    })
}

//This function listens to push messages on the server
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log(payload)
      resolve(payload)
    })
  })
