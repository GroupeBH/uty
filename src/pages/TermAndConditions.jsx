import React from 'react'
import { useNavigate } from 'react-router-dom'
import { IoClose } from 'react-icons/io5'
import utyLogo from '../assets/logo/Logo uty Web PC MICRO.png'

let paragraphs = [
  {
    title: 'Acceptation des Termes',
    text: ' En utilisant les services de Uty, vous acceptez de vous conformer à ces termes et conditions. Uty se réserve le droit de modifier ces termes à tout moment, et les utilisateurs seront informés des changements par les moyens de communication disponibles.',
  },
  {
    title: 'Utilisation du Service',
    text: "Uty permet aux vendeurs de publier des annonces, de discuter avec les acheteurs et de répondre aux demandes. Les échanges sont limités aux participants d'une même ville.",
  },
  {
    title: 'Inscription et Identité',
    text: "Pour s'inscrire, les vendeurs doivent confirmer leur identité en joignant une pièce d'identité valide.",
  },
  {
    title: 'Confidentialité et Sécurité des Données',
    text: ' Les données personnelles des utilisateurs sont stockées en toute sécurité et ne seront pas divulguées à des tiers.',
  },
  {
    title: 'Utilisation des Données',
    text: 'Uty peut utiliser les données des utilisateurs pour des annonces ciblées et des communications concernant les nouveautés et promotions.',
  },
  {
    title: 'Contenu Interdit',
    text: "La publication de produits illégaux ou illicites est strictement interdite et entraînera l'exclusion de la plateforme.",
  },
]

export default function TermAndConditions() {
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
          <h3 className="text-xl mb-3 font-poppins">Termes et conditions</h3>
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
