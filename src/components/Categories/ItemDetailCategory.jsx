import React from 'react'
import { useNavigate } from 'react-router-dom'
import Profil from '../../assets/profil.png'
import { NumericFormat } from 'react-number-format'

function ItemDetailCategory({ announce, loader }) {
  const navigate = useNavigate()
  return loader ? (
    <div
      key={announce._id}
      className="flex flex-col my-3 rounded-[10px] border-[1px] cursor-pointer shadow-[0_0_0px_rgba(20,_20,_20,_0.2)]"
      onClick={() => navigate(`/announcements/${announce._id}`)}
    >
      <div className="h-[150px] w-[100%] rounded-[10px] md:h-[195px]">
        <img
          className="h-[150px] w-[100%] rounded-t-[10px] object-cover object-center md:h-[195px]"
          src={announce.images[0] ? announce.images[0] : Profil}
          alt=""
        />
      </div>
      <div className="px-3 pb-3">
        <div className="font-bold pt-4">{announce?.name}</div>
        <div className="pt-5 pb-4 text-[12px]">
          {announce?.description || 'Pas de description pour cette annonce'}
        </div>
        <div className="flex justify-between items-center">
          <div className="text-[rgba(0,0,0,0.65)] text-[15px]">
            <div className="font-semibold text-[13px]">
              <NumericFormat
                value={announce?.price}
                displayType={'text'}
                thousandSeparator=" "
              />{' '}
              fc
            </div>
          </div>
          <span className="bg-primary text-[11px] px-4 py-[5px] text-[#ffffe8] font-medium rounded-[5px] cursor-pointer">
            Détail
          </span>
        </div>
      </div>
    </div>
  ) : (
    <div className="loading-spinner"></div>
  )
}

export default ItemDetailCategory
