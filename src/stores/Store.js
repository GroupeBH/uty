import { create } from 'zustand'

export const useStore = create((set) => ({
  coords: [],
  user: {},
  geometrie: '',
  adress: '',
  tokenFirebase: '',
  seller: {},
  currentUser: '',
  announceSeller: 'jeannot',

  updateCoords: () => {
    if (!navigator.geolocation) {
      console.log('location not supproted')
    } else {
      console.log('locating...')
      navigator.geolocation.getCurrentPosition(
        (position) => {
          set({ coords: [position.coords.latitude, position.coords.longitude] })
        },
        () => {
          console.log('enabled to retrieve location')
        }
      )
    }
  },

  updateGeometrie: (newGeometrie) => {
    set({ geometrie: newGeometrie })
  },

  updateAdress: (newAdress) => {
    set({ adress: newAdress })
  },

  updateUser: (newUser) => {
    set({ user: newUser })
  },

  updateCurrentUser: (newCurrentUser) => {
    set({ currentUser: newCurrentUser })
  },

  updateAnnounceSeller: (newAnnounceSeller) => {
    set({ announceSeller: newAnnounceSeller })
  },

  updateLocation: (newLocation) => {
    set({ location: newLocation })
  },

  updateTokenFirebase: (newToken) => {
    set({ tokenFirebase: newToken })
  },

  updateUserStatus: (newUserstatus) => {
    set({ userStatus: newUserstatus })
  },

  updateSeller: (newSeller) => {
    set({ seller: newSeller })
  },
}))
