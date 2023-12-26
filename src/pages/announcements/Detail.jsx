import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAnnouncement } from '../../services/Announcements/getAnnouncement'
import ImageCarroussel from '../../components/ImageCarroussel'
import { NumericFormat } from 'react-number-format'

export default function Detail() {
  const params = useParams()
  const [announcement, setAnnouncement] = useState()

  const navigate = useNavigate()

  useEffect(() => {
    getAnnouncement(params.id, setAnnouncement)
  }, [])

  return (
    <div className="bg-white mt-10 px-[16px] flex justify-center items-center md:px-5">
      <div className="">
        <div className="flex justify-between items-center">
          <h3 className="font-poppins text-lg">Details de l{"'"}annonce</h3>
        </div>
        <div className="flex w-[100%] pt-5 lg:flex-row sm:flex-col">
          <div className="flex lg:w-[50%] sm:w-[100%] flex-col">
            <div className=" md:py-3 mb-3 rounded-lg shadow-[10px 10px 5px silver] shadow-slate-500 flex justify-center items-center">
              <ImageCarroussel images={announcement?.images} />
            </div>
          </div>

          <div className="lg:pl-10 md:px-10 text-slate-500">
            <div className="pt-3">
              categorie -- <span>{announcement?.category.name}</span>
            </div>

            <div className="py-3">
              <div className="text-3xl text-slate-900">
                <h3>{announcement?.name}</h3>
              </div>
              <div className="text-sm">
                <p>{announcement?.description}</p>
              </div>
            </div>

            <div className="text-3xl text-slate-700 font-black">
              <NumericFormat
                value={announcement?.price}
                displayType={'text'}
                thousandSeparator=" "
              />{' '}
              fc
            </div>

            <div className="pt-5">
              <button
                className="bg-secondary text-sm text-primary p-3 rounded-lg"
                onClick={() =>
                  navigate(`/Account/announcements/edit/${params.id}`)
                }
              >
                Modifier l{"'"}annonce
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
