import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getOffer } from '../../services/Orders/get-offer'
import ImageCarroussel from '../../components/ImageCarroussel'

export default function Detail() {
  const params = useParams()
  const [offer, setOffer] = useState()

  useEffect(() => {
    getOffer(params.id, setOffer)
  }, [])

  return (
    <div className="bg-white mt-10 px-[16px] w-[100%] flex justify-center items-center md:px-0">
      <div className="w-[100%]">
        <div className="">
          <h3 className="font-poppins text-lg">Details de l{"'"}offer</h3>
          <h3 className="text-sm">
            Discuter pour acheter au prix qui vous convients
          </h3>
        </div>
        <div className="flex w-[100%] pt-5 lg:flex-row sm:flex-col">
          <div className="flex lg:w-[50%] sm:w-[100%] flex-col">
            <div className=" md:py-3 mb-3 rounded-lg shadow-[10px 10px 5px silver] shadow-slate-500 flex justify-center items-center">
              <ImageCarroussel images={offer?.medias} />
            </div>
          </div>

          <div className="lg:pl-10 md:px-10 lg:w-[50%] lg:flex lg:flex-col lg:justify-center text-slate-500">
            <div className="py-3">
              <h5 className="mb-1">Déscription</h5>
              <div className="text-sm">
                <p>{offer?.description}</p>
              </div>
            </div>

            <div className="text-3xl text-slate-700 font-black">
              <p>{offer?.price} fc</p>
            </div>

            <div className="pt-5 w-[100%]">
              <button className="bg-secondary w-[100%] text-sm text-primary p-3 rounded-lg">
                Discutter avec le vendeur
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
