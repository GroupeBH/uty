import React, { useEffect, useState } from 'react'
import UserInfos from '../../components/user/UserInfos'
// import SellerInfo from '../../components/seller/SellerInfo'
import { getSeller } from '../../services/Sellers/get-seller'

export default function index() {
  const [seller, setSeller] = useState()
  const currentUser = JSON.parse(localStorage.getItem('currentUser'))

  useEffect(() => {
    getSeller(currentUser?._id, setSeller)
    console.log(seller)
  }, [])
  return (
    <div className="mt-12">
      <div>
        <UserInfos user={currentUser} />
      </div>
      {/* <div>
        <SellerInfo seller={seller} />
      </div> */}
    </div>
  )
}
