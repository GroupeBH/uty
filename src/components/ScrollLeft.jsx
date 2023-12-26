import React, { useRef } from 'react'
import { FaArrowRight } from 'react-icons/fa'

function ScrollLeft({ containerRef }) {
  const windowWidth = useRef(window.innerWidth)

  const scrollLeft = () => {
    containerRef.current.scrollLeft += 200
  }

  return (
    <>
      {windowWidth.current > 645 ? (
        <div onClick={scrollLeft} className="  p-2 cursor-pointer ">
          <FaArrowRight />
        </div>
      ) : (
        ''
      )}
    </>
  )
}

export default ScrollLeft
