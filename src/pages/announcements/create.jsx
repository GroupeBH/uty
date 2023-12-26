import React, { useState, useEffect } from 'react'
import { getCategories } from '../../services/Categories/get-categories'
// import { useNavigate } from 'react-router-dom'
import { postAnnouncement } from '../../services/Announcements/post-announcement'
import BigImage from '../../components/BigImage'
import _ from 'lodash'
import { BsFillXCircleFill } from 'react-icons/bs'
import Seller from '../sellers/Seller'

export default function create() {
  const currentSeller = JSON.parse(localStorage.getItem('seller'))
  const currentAnnouncement = JSON.parse(localStorage.getItem('announcement'))

  const [name, setName] = useState()
  const [price, setPrice] = useState()
  const [description, setDescription] = useState()
  const [category, setCategory] = useState()
  const [images, setImages] = useState([])
  const [picClick, setPicClick] = useState(false)
  const [imgClicked, setImgClicked] = useState()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  // const [status, setStatus] = useState()
  const [priceError, setPriceError] = useState(false)
  const [errors, setErrors] = useState({})
  const [isActive, setIsActive] = useState(true)
  // const seller = JSON.parse(localStorage.getItem('seller'))
  // console.log('seller : ', seller)

  console.log('isActive : ', isActive)

  const validateForm = () => {
    let errors = {}

    if (!name) errors.name = 'Le nom du produit est requis.'
    if (!price) errors.price = 'Le prix du produit est requis.'
    if (!description)
      errors.description = 'La description du produit est requise.'
    if (!category) errors.category = 'La catégorie du produit est requise.'
    if (images.length === 0) errors.images = 'Au moins une image est requise.'

    setErrors(errors)

    // Si l'objet errors est vide, le formulaire est valide
    return Object.keys(errors).length === 0
  }

  const data = {
    seller: currentSeller,
    name: name,
    price: price,
    description: description,
    category: category,
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
    if (currentSeller) {
      if (validateForm()) {
        console.log('data: ', data)
        setLoading(true)
        postAnnouncement(data)
        localStorage.removeItem('announcement')
      }
    } else {
      localStorage.setItem('announcement', JSON.stringify(data))

      setIsActive(false)
    }
  }

  const deleteImage = (index) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleChangePrice = (event) => {
    const inputValue = event.target.value
    if (isNaN(inputValue)) {
      setPriceError(true)
    } else {
      setPriceError(false)
      setPrice(inputValue)
    }
  }
  useEffect(() => {
    getCategories(setCategories)
  }, [])
  return isActive ? (
    <div className="mt-10">
      <div className="bg-white rounded-lg p-5">
        <div className="text-lg font-poppins pb-[2.5vh]">
          <h3>Publication d{"'"}annonce</h3>
        </div>

        {/* /*form section */}

        <div>
          <div className="flex flex-col gap-3 text-sm text-semiBold text-slate-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-7 md:mt-0">
              <div className="flex flex-col ">
                <label>Nom du produit</label>
                <input
                  className=" border-[1px] border-[rgba(90,86,86,0.08)] px-3 py-2 md:py-2 outline-none focusInput text-[15px] text-[rgba(0,0,0,0.67)] rounded-[2px] "
                  type="text"
                  value={currentAnnouncement ? currentAnnouncement?.name : null}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <p className="text-red-500">{errors.name}</p>}
              </div>
              <div className="flex flex-col ">
                <label>Prix du produit(Franc congolais)</label>
                <input
                  className=" border-[1px] border-[rgba(90,86,86,0.08)] px-3 py-2 md:py-2 outline-none text-[15px] focusInput text-[rgba(0,0,0,0.67)] rounded-[2px] "
                  type="text"
                  value={
                    currentAnnouncement ? currentAnnouncement?.price : null
                  }
                  onChange={(e) => handleChangePrice(e)}
                  placeholder="10000"
                />
                {errors.price && <p className="text-red-500">{errors.price}</p>}
                {priceError && (
                  <p className="text-red-500">
                    Veuillez saisir seulement le montant du prix pas la devise
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <label className="block mb-2">Ajouter une description</label>
              <textarea
                id="message"
                rows="4"
                value={
                  currentAnnouncement ? currentAnnouncement?.description : null
                }
                className="block p-2.5 w-full text-sm text-gray-900 outline-none rounded-lg focusInput border border-gray-300 "
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ecrire la description de votre produit ici..."
              ></textarea>
              {errors.description && (
                <p className="text-red-500">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className=" flex flex-col gap-2">
                <label htmlFor="" className="">
                  Catégorie du produit{' '}
                </label>
                <select
                  className="outline-none px-3 py-[11px] md:py-[10px] border-[rgba(90,86,86,0.08)] border-[1px]  rounded-[4px] text-[13px] focusInput"
                  onChange={(e) => {
                    console.log(e.target.value)
                    setCategory(e.target.value)
                  }}
                >
                  <option></option>
                  {categories.map((category) => (
                    <option
                      key={category._id}
                      value={currentAnnouncement?.category || category._id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-red-500">{errors.category}</p>
                )}
              </div>

              <div className=" flex flex-col gap-2">
                <label htmlFor="file" className="">
                  Ajouter les images du produit
                </label>
                <input
                  className="block outline-none px-2 py-2 md:py-[5px] border-[rgba(90,86,86,0.08)] border-[1px] rounded-[4px] focusInput w-full text-sm text-gray-900  border-gray-300 cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                  type="file"
                  onChange={selectFilesHandler}
                  accept="image/*"
                  id="file"
                  multiple
                />
                {errors.images && (
                  <p className="text-red-500">{errors.images}</p>
                )}
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
                        className="h-[10vh] w-[15vw] md:w-[5vw]"
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
                className="bg-[#3b5998]  text-[15px] hover:bg-[#3b5998] focus:ring-4 focus:outline-none cursor-pointer py-2 md:py-2 px-8 md:px-10 mt-2 rounded-[4px] text-white"
                onClick={(e) => handlePost(e, data)}
              >
                {loading ? (
                  <div className="">Publication en cours...</div>
                ) : (
                  <div className="">Publier l{"'"}annonce</div>
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
  ) : (
    <div className="bg-white p-5">
      <Seller setIsActive={setIsActive} />
    </div>
  )
}
