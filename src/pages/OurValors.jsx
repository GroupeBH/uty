import React from 'react'
import { useNavigate } from 'react-router-dom'
import { IoClose } from 'react-icons/io5'
import utyLogo from '../assets/logo/Logo uty Web PC MICRO.png'

let paragraphs = [
  {
    title: '*Intégrité et Respect*:',
    text: "Nous opérons avec intégrité et respectons les diverses cultures et réglementations des villes où nous sommes présents. Uty est synonyme de confiance et d'équité pour tous ses utilisateurs, peu importe leur emplacement.",
  },
  {
    title: '*Innovation et Vision Globale*:',
    text: "Inspirés par notre héritage congolais, nous adoptons une perspective mondiale dans notre quête d'innovation. Nous nous efforçons d'apporter des solutions créatives qui répondent aux défis uniques de chaque marché.",
  },
  {
    title: '*Responsabilité et Impact*:',
    text: "Nous sommes conscients de notre impact sur les communautés et l'environnement. Uty s'engage à promouvoir des pratiques durables et à contribuer positivement au développement des villes que nous desservons.",
  },
  {
    title: '*Qualité et Engagement*:',
    text: 'La qualité est la pierre angulaire de notre offre. Nous nous engageons à maintenir les plus hauts standards de service et à garantir la satisfaction de nos clients à travers le monde.',
  },
  {
    title: '*Solidarité et Croissance Partagée*:',
    text: 'Nous croyons en la force de la solidarité et en une croissance partagée. Uty est déterminé à soutenir les entrepreneurs locaux et à favoriser une prospérité collective.',
  },
  {
    title: '*Sécurité et Confidentialité*:',
    text: "La sécurité de nos utilisateurs et la protection de leurs données sont primordiales. Nous appliquons des protocoles de sécurité stricts et respectons la vie privée de nos utilisateurs, où qu'ils soient.",
  },
]

export default function OurValors() {
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
          <h3 className="text-xl mb-3 font-poppins">Nos valeurs</h3>
          {paragraphs.map((p, index) => {
            return (
              <div key={index} className="mb-2">
                <h5 className="font-poppins">{p.title}</h5>
                <p className="text-sm text-gray-800 text-justify">{p.text}</p>
              </div>
            )
          })}
          <p className="text-sm text-gray-800 text-justify">
            {
              "Ces principes fondamentaux guident notre stratégie et nos actions, alors que nous nous efforçons de devenir une référence mondiale dans le domaine du commerce électronique. Ils reflètent notre engagement envers l'excellence et notre passion pour connecter les gens, non seulement en RDC mais aussi dans toutes les grandes villes du monde."
            }
          </p>
        </div>
      </div>
    </div>
  )
}
