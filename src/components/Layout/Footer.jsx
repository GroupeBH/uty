import React from 'react'
import { useNavigate } from 'react-router-dom'
import Medias from '../Medias'

function Footer() {
  const navigate = useNavigate()
  return (
    <div className="bg-[#241556] text-white">
      <div className="max-w-screen-xl lg:pb-6 md:px-16">
        <div className="md:flex md:justify-between">
          <div className="flex px-6 flex-col justify-between md:px-0 w-full md:flex-row">
            <div>
              <h2 className="mb-6 pt-6 text-md text-[#ffffffde] font-bold uppercase dark:text-white md:pt-0">
                Decouvrez-nous
              </h2>
              <ul className="text-gray-500 pb-6">
                <li
                  className="mb-3"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate('/us/our-valors')
                  }}
                >
                  <a href="" className="hover:underline">
                    Nos valeurs
                  </a>
                </li>
                <li
                  className="mb-3"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate('/us/our-team')
                  }}
                >
                  <a className="hover:underline">Notre équipe</a>
                </li>
                <li
                  className=""
                  onClick={(e) => {
                    e.preventDefault()
                    navigate('/us/our-mission')
                  }}
                >
                  <a href="" className="hover:underline">
                    Notre mission
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="mb-6 text-md text-[#ffffffde] font-semibold uppercase dark:text-white">
                Mentions legales
              </h2>
              <ul className="text-gray-500 pb-6 dark:text-gray-400">
                <li
                  className="mb-4"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate('/legal/conditions')
                  }}
                >
                  <a href="#" className="hover:underline">
                    Termes et conditions
                  </a>
                </li>
                <li
                  className="mb-3"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate('/legal/confidentiality')
                  }}
                >
                  <a href="#" className="hover:underline">
                    Politique de confidentialite
                  </a>
                </li>
                <li
                  className="mb-3"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate('/legal/sell-conditions')
                  }}
                >
                  <a href="#" className="hover:underline">
                    Conditions de vente
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="mb-6 text-md text-[#ffffffde] font-semibold uppercase dark:text-white">
                Aide
              </h2>
              <ul className="text-gray-500 dark:text-gray-400 pb-5">
                <li
                  className="mb-4"
                  onClick={(e) => {
                    e.preventDefault()
                    navigate('/contact-us')
                  }}
                >
                  <a href="#" className="hover:underline">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <hr className="mb-6 border-[rgba(128,128,128,0.5)] md:mx-auto dark:border-gray-700 mt-3" />
        <div className="flex pb-6 flex-col justify-center items-center md:flex md:flex-row md:px-0 md:items-center md:justify-between md:pb-0">
          <div className="text-center pb-6 flex-col text-md text-gray-500 md:flex-row md:pb-0">
            <a href="https://flowbite.com/" className="hover:underline">
              GBH™
            </a>
            © 2023 All Rights Reserved.
          </div>
          <Medias />
        </div>
      </div>
    </div>
  )
}

export default Footer
//md:flex  md:items-center md:justify-between
