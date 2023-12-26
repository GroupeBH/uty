import React from 'react'
// import styled from 'styled-components'
import { IoClose } from 'react-icons/io5'

function BigImage({ imgSrc, setPicClick }) {
  const handleClick = () => {
    setPicClick(false)
  }
  return (
    <div className="flex items-center mx-auto justify-center top-[100vh] h-screen w-[100%] z-0 translate-x-[-0%] translate-y-[-100%] fixed">
      <div className="self-center bg-white shadow-2xl rounded-lg p-5 text-2xl font-bold">
        <IoClose onClick={handleClick} />
        <div className="">
          <img src={imgSrc} className="h-[60vh] w-[80vw] md:w-[35vw]" />
        </div>
      </div>
    </div>
  )
}

export default BigImage
