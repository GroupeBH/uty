import React from 'react'
// import _ from 'lodash'
import { BsFillXCircleFill } from 'react-icons/bs'

export default function ImagesList({
  images,
  setPicClick,
  setImgClicked,
  setImages,
  setImagesToDelete,
}) {
  const deleteImage = (index) => {
    if (setImagesToDelete) {
      setImagesToDelete(images.filter((_, i) => i === index))
    }

    setImages(images.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div className="flex sm:flex-wrap">
        {images?.map((image, index) => (
          <div className="flex mr-3 pb-1" key={index}>
            <div className="flex shadow-md p-3">
              <img
                src={image}
                className="h-[10vh] lg:w-[5vw] sm:w-[15vw]"
                alt="products-images"
                onClick={() => {
                  setPicClick(true)
                  setImgClicked(image)
                }}
              />
            </div>
            <div
              className="text-red-500 -ml-1"
              onClick={(e) => {
                e.preventDefault()
                deleteImage(index)
                console.log('image', images)
              }}
            >
              <BsFillXCircleFill />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
