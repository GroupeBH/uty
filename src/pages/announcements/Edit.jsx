import React, { useState, useEffect } from 'react'
import { getCategories } from '../../services/Categories/get-categories'
import { updateAnnouncement } from '../../services/Announcements/update-announcement'
import { getAnnouncement } from '../../services/Announcements/getAnnouncement'
import BigImage from '../../components/BigImage'
import _ from 'lodash'
// import { BsFillXCircleFill } from 'react-icons/bs'
import ImagesList from '../../components/ImagesList'
import { useParams } from 'react-router-dom'

export default function edit() {
  const params = useParams()
  // const currentSeller = JSON.parse(localStorage.getItem('seller'))

  const [name, setName] = useState()
  const [price, setPrice] = useState()
  const [description, setDescription] = useState()
  const [category, setCategory] = useState()
  const [images, setImages] = useState([])
  const [picClick, setPicClick] = useState(false)
  const [imgClicked, setImgClicked] = useState()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [dataImgs, setDataImgs] = useState([])
  const [imagesToDelete, setImagesToDelete] = useState([])

  const [announcement, setAnnouncement] = useState()

  const [errors, setErrors] = useState({})

  const data = {
    name: name,
    price: price,
    description: description,
    category: category,
    images: dataImgs,
    newImages: images,
    imagesToDelete: imagesToDelete,
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

  const validateForm = () => {
    let errors = {}

    if (!name) errors.name = 'Le nom du produit est requis.'
    if (!price) errors.price = 'Le prix du produit est requis.'
    if (!description)
      errors.description = 'La description du produit est requise.'
    if (!category) errors.category = 'La catégorie du produit est requise.'
    if (images.length === 0 && dataImgs.length === 0)
      errors.images = 'Au moins une image est requise.'

    setErrors(errors)

    // Si l'objet errors est vide, le formulaire est valide
    return Object.keys(errors).length === 0
  }

  const handlePost = (e, id, data) => {
    e.preventDefault()
    if (validateForm()) {
      setLoading(true)
      updateAnnouncement(id, data)
    }
  }

  useEffect(() => {
    getAnnouncement(params.id, setAnnouncement)
    getCategories(setCategories)
  }, [params])

  useEffect(() => {
    setCategory(announcement?.category._id)
    setName(announcement?.name)
    setDescription(announcement?.description)
    setDataImgs(announcement?.images)
    setPrice(announcement?.price)
  }, [announcement])
  return (
    <div className="">
      <div className="mt-10 rounded-lg">
        <div className="text-lg font-poppins px-5 md:px-0">
          <h3>Modification d{"'"}annonce</h3>
        </div>

        <div className="px-[16px] py-2 md:px-0 md:py-0">
          {!_.isEmpty(images) ||
            (!_.isEmpty(dataImgs) && (
              <p className="py-3 text-slate-600 text-sm ">
                Les images du produit
              </p>
            ))}
          <div className="flex">
            <ImagesList
              images={dataImgs}
              setImages={setDataImgs}
              setImgClicked={setImgClicked}
              setPicClick={setPicClick}
              setImagesToDelete={setImagesToDelete}
            />

            <ImagesList
              images={images}
              setImages={setImages}
              setImgClicked={setImgClicked}
              setPicClick={setPicClick}
            />
          </div>
        </div>

        <div className="px-[16px] md:px-0">
          <div className="flex flex-col gap-3  text-semiBold text-slate-600 text-sm">
            <div className="grid md:grid-cols-3 gap-3 pt-3">
              <div className="flex flex-col gap-2 text-slate-600 text-sm">
                <label htmlFor="file" className="">
                  Ajouter les images du produit
                </label>
                <input
                  className=" border-[1px] border-[rgba(90,86,86,0.08)] px-3 my-2 md:py-[5px] outline-none text-[15px] focusInput text-[rgba(0,0,0,0.67)] rounded-[2px]"
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
              <div className="flex flex-col">
                <label className="mb-2">Nom du produit</label>
                <input
                  className=" border-[1px] border-[rgba(90,86,86,0.08)] px-3 py-2 md:py-2 outline-none text-[15px] focusInput text-[rgba(0,0,0,0.67)] rounded-[2px]"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <p className="text-red-500">{errors.name}</p>}
              </div>
              <div className="flex flex-col">
                <label className="mb-2">Prix du produit</label>
                <input
                  className=" border-[1px] border-[rgba(90,86,86,0.08)] px-3 py-2 md:py-2 outline-none text-[15px] focusInput text-[rgba(0,0,0,0.67)] rounded-[2px]"
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                {errors.price && <p className="text-red-500">{errors.price}</p>}
              </div>
            </div>
            <div className="flex flex-col">
              <label className="block mb-2">Ajouter une description</label>
              <textarea
                id="message"
                rows="4"
                value={description}
                className="block p-2.5 w-full text-sm text-gray-900 outline-none rounded-lg focusInput border border-gray-300 "
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ecrire la description de votre produit ici..."
              ></textarea>
              {errors.description && (
                <p className="text-red-500">{errors.description}</p>
              )}
            </div>

            <div className="flex lg:flex-row lg:w-[70vw] sm:flex-col sm:gap-3">
              <div className="lg:w-[49%] flex flex-col gap-2">
                <label htmlFor="" className="">
                  Catégorie du produit{' '}
                </label>
                <select
                  className="utline-none px-3 py-[11px] md:py-[10px] border-[rgba(90,86,86,0.08)] border-[1px]  rounded-[4px] text-[13px] focusInput"
                  onChange={(e) => {
                    console.log(e.target.value)
                    setCategory(e.target.value)
                  }}
                  value={category}
                >
                  <option></option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-red-500">{errors.category}</p>
                )}
              </div>
            </div>

            <div className="">
              <button
                className="text-white bg-[#3b5998] hover:bg-[#3b5998]/90 focus:ring-4 focus:outline-none focus:ring-[#3b5998]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#3b5998]/55 me-2 mb-2"
                onClick={(e) => handlePost(e, params.id, data)}
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
  )
}
