import React from 'react'
import UpdateProfilUser from './ProfilUser'
import ProfilSellerUpdate from './ProfilSeller'
import { useNavigate } from 'react-router-dom'

export default function UserInfos() {
  const navigate = useNavigate()

  const user = JSON.parse(localStorage.getItem('currentUser'))
  const sellerId = JSON.parse(localStorage.getItem('seller')) || null

  return (
    <div className="grid px-[16px] md:grid-cols-2 gap-4 mt-[60px] md-px-0 md:mt-0">
      <UpdateProfilUser user={user} />
      {sellerId ? (
        <ProfilSellerUpdate sellerId={sellerId} />
      ) : (
        <div className=" mt-2 pb-5 md:pb-0">
          <div className="pt-5 text-[20px] font-medium pb-1">
            {"Vous n'etes pas vendeur!"}
          </div>
          <div className="text-[#353434] mb-3 md:mb-0 font-light">
            {
              'Pour devenir vendeur, vous devez cliquer sur le bouton devenir vendeur et remplir les informations demandées.'
            }
          </div>
          <div
            className="bg-primary cursor-pointer md:mt-6 text-[14px] text-white  text-center inline-block py-[6px] px-7 rounded-[3px]"
            onClick={() => navigate('/Account/seller')}
          >
            Devenir vendeur
          </div>
        </div>
      )}
    </div>
  )
}
