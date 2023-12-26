import React, { useEffect, useState } from 'react'
import { getWantedProducts } from '../../services/Orders/get-wanteds'
import defaultImg from '../../assets/default.png'
import { useNavigate } from 'react-router-dom'
import _ from 'lodash'

export default function WantedList() {
  const [wanteds, setWanteds] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    getWantedProducts(setWanteds)
  }, [])
  return (
    <div className="p-10">
      <div className="mb-5">
        <h3 className="font-poppins text-gray-1000 text-xl">
          Les produits actuellement recherchés
        </h3>
        <p className="text-sm text-gray-700">
          Elargissez votre champs d{"'"}action en vendant au delà de vos
          annonces{' '}
        </p>
      </div>
      <div className="w-[100%] grid grid-cols-2 gap-2 md:grid-cols-4">
        {wanteds?.map((wanted) => {
          return (
            <div
              key={wanted._id}
              className="md:w-[12vw] shadow border  bg-white rounded-lg"
            >
              <div className="w-[100%]">
                <img
                  src={
                    _.isEmpty(wanted.wanted.medias[0])
                      ? defaultImg
                      : wanted.wanted.medias[0]
                  }
                  className="w-[100%] h-[20vh]"
                  alt=""
                />
              </div>
              <div className="p-3">
                <div className="font-roboto flex flex-col">
                  <p className="mb-2 text-sm">Description</p>
                  <span className="text-sm text-gray-800">
                    {wanted.wanted.text}
                  </span>
                  <button
                    className="p-2 mt-2 text-sm bg-primary rounded-lg text-white"
                    onClick={() =>
                      navigate(`/Account/products-wanted/${wanted._id}`)
                    }
                  >
                    Voir et proposer
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
