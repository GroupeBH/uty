import React, { useEffect, useState } from 'react'
import { getOffers } from '../../services/Orders/get-offers'
import defaultImg from '../../assets/default.png'
import { useNavigate } from 'react-router-dom'
import _ from 'lodash'

export default function Offers() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'))

  const [offers, setOffers] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    getOffers(currentUser._id, setOffers)
  }, [])
  return (
    <div className="p-5 mt-10">
      <div className="mb-5">
        <h3 className="font-poppins text-gray-1000 text-xl">
          Les offres reçus
        </h3>
        <p className="text-sm text-gray-700">
          Avec uty, vous avez le choix de choisir le produit qui vous convients
        </p>
      </div>
      <div className="w-[100%] grid grid-cols-2 md:grid-cols-5 gap-3">
        {offers?.map((proposal) => {
          return (
            <div
              key={proposal._id}
              className="md:w-[12vw] border border-[rgba(69,147,224,0.34)] bg-white rounded-[0.25rem]"
            >
              <div className="w-[100%]">
                <img
                  src={
                    _.isEmpty(proposal?.medias[0])
                      ? defaultImg
                      : proposal?.medias[0]
                  }
                  className="w-[100%] h-[20vh]"
                  alt=""
                />
              </div>
              <div className="p-2">
                <div>
                  <p className="text-sm">Description</p>
                  <span className="text-sm text-gray-800">
                    {proposal?.description}
                  </span>
                </div>
                <div>
                  <span className="font-poppins text-gray-800">
                    {proposal?.price} fc
                  </span>
                  <button
                    onClick={() => navigate(`/Account/offers/${proposal._id}`)}
                    className="text-sm text-white w-[100%] bg-primary p-1 rounded-sm"
                  >
                    Voir plus
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
