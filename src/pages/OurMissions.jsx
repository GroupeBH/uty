import React from 'react'
import { useNavigate } from 'react-router-dom'
import { IoClose } from 'react-icons/io5'
import utyLogo from '../assets/logo/Logo uty Web PC MICRO.png'

let paragraphs = [
  {
    text: "*Uty* est née de l'ambition de redéfinir le commerce électronique à partir de ses racines en République démocratique du Congo, avec une vision qui transcende les frontières. Notre mission est de créer une plateforme de e-commerce globale qui facilite les échanges commerciaux locaux dans les grandes villes du monde, tout en valorisant les spécificités culturelles et économiques de chaque communauté.",
  },
  {
    text: "Nous nous engageons à construire des ponts entre les vendeurs et les acheteurs, en offrant une expérience utilisateur sécurisée, intuitive et personnalisée. En mettant l'accent sur l'authenticité et la proximité, Uty vise à stimuler l'économie locale tout en préparant le terrain pour une expansion internationale.",
  },
  {
    text: "Nous aspirons à être le catalyseur du commerce électronique en République démocratique du Congo, en créant une plateforme inclusive qui démocratise l'accès au marché pour tous les vendeurs, des boutiques établies aux entrepreneurs individuels. Notre objectif est de transformer la manière dont les transactions commerciales sont réalisées dans les villes, en offrant une solution qui non seulement facilite les échanges économiques mais qui renforce également les liens communautaires.",
  },
  {
    text: "Nous nous engageons à fournir une expérience utilisateur exceptionnelle, où la sécurité, la simplicité et l'efficacité sont au cœur de chaque interaction. En confirmant l'identité de nos vendeurs et en sécurisant les transactions, nous instaurons un environnement de confiance où acheteurs et vendeurs peuvent opérer en toute sérénité.",
  },
  {
    text: "Notre plateforme est conçue pour être un moteur de croissance économique, en permettant aux vendeurs de toutes tailles de prospérer et en offrant aux consommateurs un accès à une diversité de produits et services locaux. En mettant l'accent sur les transactions intra-urbaines, nous soutenons l'économie locale et contribuons à réduire l'empreinte carbone associée à la livraison des produits.",
  },
]

export default function OurMission() {
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
          <h3 className="text-xl mb-3 font-poppins">Notre mission</h3>
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
