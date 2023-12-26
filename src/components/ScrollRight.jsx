import React, { useRef } from 'react'
import { FaArrowLeft } from 'react-icons/fa'

function ScrollRight({ containerRef }) {
  const windowWidth = useRef(window.innerWidth)

  const scrollRight = () => {
    containerRef.current.scrollLeft -= 200
  }

  return (
    <>
      {windowWidth.current > 645 ? (
        <div onClick={scrollRight} className=" p-2  cursor-pointer">
          <FaArrowLeft />
        </div>
      ) : (
        ''
      )}
    </>
  )
}

export default ScrollRight
