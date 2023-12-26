import React from 'react'
import { useNavigate } from 'react-router-dom'
import { IoClose } from 'react-icons/io5'
import utyLogo from '../assets/logo/Logo uty Web PC MICRO.png'

export default function MentionsLegal() {
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
          <h3 className="text-xl mb-3 font-poppins">
            Politique de confidentialité
          </h3>
          <div className="mb-2">
            <p className="text-sm text-gray-800 text-justify">
              {
                "Uty est un produit de la société *GBH sarl, située au n°44 de l'avenue Sendwe, commune de Kalamu, Kinshasa. Le capital virtuel de Uty est de **1.000.000$* pré-money."
              }
            </p>
            <p>
              {
                "Uty s'engage à protéger la vie privée de ses utilisateurs. Les données collectées sont utilisées exclusivement dans le cadre des services proposés par Uty et ne seront pas partagées sans consentement explicite"
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
