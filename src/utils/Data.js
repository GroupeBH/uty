import commande from '../assets/Affaires concl.png'
import vendus from '../assets/Articles vendus.png'
import recettes from '../assets/Chiffre daffaire.png'
import map from '../assets/map.png'

export const DashboardUI = [
  {
    imgSrc: vendus,
    title: 'Commandes en attente',
    path: '/Orders',
  },
  {
    imgSrc: commande,
    title: 'Commandes en attente de livraison',
    path: '/Orders-to-deliver',
  },
  {
    imgSrc: recettes,
    title: 'Historique des ventes',
    path: '',
  },
  {
    imgSrc: map,
    title: 'Commandes en livraison',
    path: '',
  },
]
