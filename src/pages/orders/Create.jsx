import React, { useState, useEffect } from 'react'
import { getCategory } from '../../services/Categories/get-category'
import { useParams, useNavigate } from 'react-router-dom'
import { createWanted } from '../../services/Orders/create-wanted'
import ImagesList from '../../components/ImagesList'
import BigImage from '../../components/BigImage'
import sideImg from '../../assets/lady.png'
import _ from 'lodash'

export default function create() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'))
  // const navigate = useNavigate()
  const params = useParams()

  const [description, setDescription] = useState()
  const [category, setCategory] = useState()
  const [images, setImages] = useState([])
  const [picClick, setPicClick] = useState(false)
  const [imgClicked, setImgClicked] = useState()
  const [loading, setLoading] = useState(false)
  // const [status, setStatus] = useState()
  const navigate = useNavigate()

  const data = currentUser
    ? {
        user: currentUser?._id,
        description: description,
        category: category?.category?._id,
        images: images,
      }
    : {}

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
    createWanted(data)
  }

  useEffect(() => {
    if (!currentUser) {
      navigate('/sign-in')
    }
  }, [currentUser])

  useEffect(() => {
    getCategory(params.id, setCategory)
  }, [])
  return (
    <div className="">
      <div className="md:w-[100%] grid md:grid-cols-2">
        <div className="bg-gray-100 hidden md:block md:h-[100vh] md:w-[35vw] md:pt-32">
          <img src={sideImg} className="h-[50vh] m-auto" alt="" />
        </div>
        <div className="bg:white p-5 md:px-16 md:ml-[-15vw] md:py-28">
          <div className="pb-5">
            <p className="pb-2">
              Catégorie--
              <span className="font-poppins text-primary">
                {category?.category?.name}
              </span>
            </p>
            <p>
              Salut{' '}
              <span className="font-poppins text-secondary">
                {currentUser?.username + ' '}
              </span>
              trouvons votre produit
            </p>
          </div>

          {/* /*form section */}

          <div>
            <div className="flex flex-col gap-3 text-sm text-semiBold text-slate-600">
              <div className="flex flex-col">
                <label className="block mb-2">
                  Decrivez-nous ce que vous voulez
                </label>
                <textarea
                  id="message"
                  rows="4"
                  className="block p-2.5 w-full text-sm text-gray-900 outline-none rounded-lg focusInput border border-gray-300 "
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ecrire la description de votre produit ici..."
                ></textarea>
              </div>

              <div className="">
                <div className=" flex flex-col gap-2">
                  <label htmlFor="file" className="">
                    Vous pouvez ajouter des images pour plus de details
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

              <ImagesList
                images={images}
                setImages={setImages}
                setImgClicked={setImgClicked}
                setPicClick={setPicClick}
              />

              <div className="">
                <button
                  className="bg-primary w-[100%] md:w-[50%] text-[15px] hover:bg-[#3b5998] focus:ring-4 focus:outline-none cursor-pointer py-3 md:py-3 px-8 md:px-10 mt-2 rounded-[4px] text-white"
                  onClick={(e) => handlePost(e, data)}
                >
                  {loading ? (
                    <div className="">Envoi en cours...</div>
                  ) : (
                    <div className="">Lancer la demande</div>
                  )}
                </button>
              </div>
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
