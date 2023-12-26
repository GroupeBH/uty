import React from 'react'
import team from '../assets/TEAM UTY.png'
import Nav from '../components/Layout/Nav'

export default function OurTeam() {
 return (
    <div className="">
      <div>
        <Nav />
      </div>
      <div className="p-5 pt-24 shadow-lg">
        <div className="text-center">
          <h3 className="text-2xl text-gray-500 font-poppins">
            Rencontrer notre équipe
          </h3>
          <p className="text-sm font-roboto">
            uty est une plateforme e-commerce dynamique et innovante. Nous
            combinons technologie et créativité pour offrir une expérience
            d’achat en ligne sécurisée. Notre mission est de soutenir les
            entreprises locales tout en servant les consommateurs.
          </p>
        </div>

        <div className="flex justify-center items-center">
          <img src={team} className="w-[70vw] h-[70vh]" alt="" />
        </div>
      </div>
    </div>
  )
}
