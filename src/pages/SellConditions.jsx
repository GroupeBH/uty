import React from 'react'
import { useNavigate } from 'react-router-dom'
import { IoClose } from 'react-icons/io5'
import utyLogo from '../assets/logo/Logo uty Web PC MICRO.png'

let paragraphs = [
  {
    title: 'Paiement',
    text: 'Les paiements peuvent être effectués par carte bancaire, mobile money et autres fintech populaires dans la ville spécifique.',
  },
  {
    title: 'Livraison',
    text: "La livraison est assurée par des livreurs indépendants utilisant l'application Uty.",
  },
  {
    title: 'Annulation et Retour',
    text: 'Les annulations et retours seront remboursés à hauteur de la valeur du produit. Les frais de livraison et de service ne sont pas remboursables.',
  },
  {
    title: 'Assurance',
    text: "Les produits perdus ou endommagés lors de la livraison seront couverts par l'assurance souscrite par Uty.",
  },
]

export default function SellConditions() {
  let navigate = useNavigate()
  return (
    <div className="block p-20 h-screen">
      <div className="shadow-lg p-10 mt-[-5vh]">
        <div className="flex justify-between items-center mb-3">
          <div>
            <img src={utyLogo} alt="" />
          </div>
          <div
            className="cursor-pointer text-2xl font-bold"
            onClick={() => navigate(-1)}
          >
            <IoClose />
          </div>
        </div>
        <div>
          <h3 className="text-xl mb-3 font-poppins">Conditions de vente</h3>
          {paragraphs.map((p, index) => {
            return (
              <div key={index} className="mb-2">
                <h5 className="font-poppins">{p.title}</h5>
                <p className="text-sm text-gray-800 text-justify">{p.text}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
