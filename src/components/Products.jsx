import React, { useEffect, useState } from 'react'
// import axios from 'axios'
import ItemProduct from './ItemProduct'
import { getAnnouncements } from '../services/Announcements/get-announcements'

function Products() {
  const [announces, setAnnounces] = useState()
  const [loader, setLoader] = useState(false)

  useEffect(() => {
    getAnnouncements(setAnnounces, setLoader)
    // axios
    //   .get(`https://uty-ti30.onrender.com/api/annonce/get-annonces`)
    //   .then((response) => {
    //     setTimeout(() => {
    //       setLoader(true)
    //     }, 3500)
    //     setAnnounces(response?.data?.announcements)
    //   })
    //   .catch((error) => {
    //     console.log(error)
    //   })
  }, [])

  return (
    <div className="px-5 pb-20 md:px-16">
      {loader ? (
        <h2 className="text-[#21344e] text-[16px] font-bold pb-4 md:pt-0 capitalize md:text-[23px]">
          Annonces recentes
        </h2>
      ) : (
        ''
      )}
      <div className="grid grid-cols-2 lg:grid-cols-5">
        <ItemProduct data={announces} loader={loader} />
      </div>
    </div>
  )
}

export default Products
