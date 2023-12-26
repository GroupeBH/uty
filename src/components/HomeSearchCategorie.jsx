import React from 'react'
import { FaSearch } from 'react-icons/fa'

function HomeSearchCategorie() {
  return (
    <div className="relative mb-2 w-[100%] md:relative md:z-20">
      <input
        className="bg-white outline-none py-[7px] w-[100%] px-[17px] text-[#414142] rounded-[4px] md:rounded-4 md:w-[71%]"
        type="text"
        placeholder="Rechercher toutes les categories"
      />
      <FaSearch className="absolute text-[13px] top-[13px] opacity-50 text-[#00239e] md:text-[14px]  md:top-[12px] md:left-[800px] sm:right-[10px]" />
    </div>
  )
}

export default HomeSearchCategorie
