import React from 'react'
import { Carousel } from 'react-responsive-carousel'
import 'react-responsive-carousel/lib/styles/carousel.min.css'

export default function ImageCarroussel({ images }) {
  return (
    <div>
      <Carousel autoPlay infiniteLoop showThumbs={false}>
        {images?.map((image, index) => (
          <div className="item" key={index}>
            <img
              src={image}
              className="h-[30vh] md:h-[50vh] rounded object-cover"
              alt=""
            />
          </div>
        ))}
      </Carousel>
    </div>
  )
}
