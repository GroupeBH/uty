import React, { useState } from 'react'
// import { useNavigate } from 'react-router-dom'
import { createProposal } from '../../services/Orders/create-proposal'
import BigImage from '../../components/BigImage'
import _ from 'lodash'
import { BsFillXCircleFill } from 'react-icons/bs'

export default function createForm({ order }) {
  const currentSeller = JSON.parse(localStorage.getItem('seller'))
  // const navigate = useNavigate()

  const [price, setPrice] = useState()
  const [description, setDescription] = useState()
  const [images, setImages] = useState([])
  const [picClick, setPicClick] = useState(false)
  const [imgClicked, setImgClicked] = useState()
  const [loading, setLoading] = useState(false)
  // const [status, setStatus] = useState()

  const data = {
    seller: currentSeller,
    order: order._id,
    price: price,
    description: description,
    images: images,
  }

  const readFileHandler = (file) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = () => {
      setImages((curr) => [...curr, reader.result])
      return reader.result
    }
  }

  const selectFilesHandler = async (e) => {
    const imagesData = []
    _.forEach(e.target.files, (file) => {
      imagesData.push(readFileHandler(file))
    })
    console.log(images)
  }

  const handlePost = (e, data) => {
    e.preventDefault()
    console.log('data: ', data)
    setLoading(true)
    createProposal(data)
  }

  const deleteImage = (index) => {
    setImages(images.filter((_, i) => i !== index))
  }

  return (
    <div className="">
      <div className="bg-white rounded-lg p-5">
        <div className="text-lg font-bold pb-[2.5vh]">
          <h3>Proposition d{"'"}un produit</h3>
        </div>

        {/* /*form section */}

        <div>
          <div className="flex flex-col gap-3 text-sm text-semiBold text-slate-600">
            <div className="grid mt-7 md:mt-0">
              <div className="flex flex-col ">
                <label>Proposer un prix</label>
                <input
                  className=" border-[1px] border-[rgba(90,86,86,0.08)] px-3 py-2 md:py-2 outline-none text-[15px] focusInput text-[rgba(0,0,0,0.67)] rounded-[2px] "
                  type="text"
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col">
              <label className="block mb-2">Ajouter une description</label>
              <textarea
                id="message"
                rows="4"
                className="block p-2.5 w-full text-sm text-gray-900 outline-none rounded-lg focusInput border border-gray-300 "
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ecrire la description de votre produit ici..."
              ></textarea>
            </div>

            <div className="grid">
              <div className=" flex flex-col gap-2">
                <label htmlFor="file" className="">
                  Ajouter les images de votre proposition
                </label>
                <input
                  className="block outline-none px-2 py-2 md:py-[5px] border-[rgba(90,86,86,0.08)] border-[1px] rounded-[4px] focusInput w-full text-sm text-gray-900  border-gray-300 cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                  type="file"
                  onChange={selectFilesHandler}
                  accept="image/*"
                  id="file"
                  multiple
                />
              </div>
            </div>

            <div>
              {!_.isEmpty(images) && (
                <p className="py-3">Les images du produit</p>
              )}
              <div className="flex sm:flex-wrap">
                {images.map((image, index) => (
                  <div className="flex mr-3 pb-1" key={index}>
                    <div className="flex shadow-md p-3">
                      <img
                        src={image}
                        className="h-[10vh] w-[5vw]"
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

            <div className="">
              <button
                className="bg-[#3b5998] w-[100%] md:w-[30%] text-[15px] hover:bg-primary focus:ring-4 focus:outline-none cursor-pointer py-3 md:py-2 px-8 md:px-10 mt-2 rounded-[4px] text-white"
                onClick={(e) => handlePost(e, data)}
              >
                {loading ? (
                  <div className="">Envoi de la proposition...</div>
                ) : (
                  <div className="">Proposer le produit</div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-center items-center w-[100%]">
        {picClick && <BigImage imgSrc={imgClicked} setPicClick={setPicClick} />}
      </div>
    </div>
  )
}
