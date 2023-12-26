import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import _ from 'lodash'
// import axios from 'axios'
import Nav from '../../components/Layout/Nav'
import ItemDetailCategory from '../../components/Categories/ItemDetailCategory'
import { getCategory } from '../../services/Categories/get-category'
import { getAnnouncementsByCategory } from '../../services/Announcements/get-announcementsByCategory'
import { IoArrowForward, IoArrowBack } from 'react-icons/io5'

const itemsPerPage = 12
function DetailCategory() {
  const params = useParams()
  const [announces, setAnnounces] = useState(null)
  const [loader, setLoader] = useState()
  const navigate = useNavigate()
  // const param = params.id.toLowerCase()

  const [category, setCategory] = useState([])

  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  // const getCategories = async () => {
  //   const response = await axios.get(
  //     `https://uty-ti30.onrender.com/api/category/getCategories/${param}`
  //   )
  //   try {
  //     if (response) {
  //       setCategory(response.data)
  //       setTimeout(() => {
  //         setLoader(true)
  //       }, 700)
  //     }
  //   } catch (err) {
  //     console.log(err)
  //   }
  // }

  useEffect(() => {
    getCategory(params.id, setCategory)
  }, [])

  useEffect(() => {
    // axios
    //   .get(`https://uty-ti30.onrender.com/api/annonce/getAnnonces/${params.id}`)
    //   .then((response) => {
    //     setAnnounces(response?.data)
    //     setTimeout(() => {
    //       setLoader(true)
    //     }, 700)
    //   })
    //   .catch((error) => {
    //     console.log(error)
    //   })
    getAnnouncementsByCategory(params.id, setAnnounces, setLoader)
  }, [])

  useEffect(() => {
    setTotalPages(Math.ceil(announces?.length / itemsPerPage))
  }, [announces])

  const items = announces?.slice(
    currentPage * itemsPerPage,
    currentPage * itemsPerPage + itemsPerPage
  )

  return (
    <div>
      <div>
        <Nav />
      </div>
      <div className="px-5 py-6 md:p-20">
        <div className="flex mb-5 gap-12 items-center md:flex-row md:gap-32 md:items-center">
          <h2 className="text-title text-black font-bold border-1 rounded-[5px]">
            {category?.category?.name}
          </h2>
          <p
            className="text-primary font-light flex items-center text-sm cursor-pointer"
            onClick={() => navigate(`/find-product/${params.id}`)}
          >
            <span className="pr-3">Demande personnalisée</span>{' '}
            <IoArrowForward />
          </p>
        </div>
        <div>
          <div className="text-[rgba(31,29,29,0.87)] text-[17px]">
            {category?.category?.description ||
              'Pas de description pour cette categorie'}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-8">
            {items?.map((announce) => (
              <div key={announce._id}>
                <ItemDetailCategory announce={announce} loader={loader} />
              </div>
            ))}
          </div>
          {!_.isEmpty(announces) && (
            <div className="flex items-center justify-center w-full gap-3">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
              >
                <IoArrowBack />
              </button>
              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  className={
                    currentPage !== index
                      ? 'text-white bg-primary rounded-full px-2'
                      : 'text-white bg-secondary rounded-full px-2'
                  }
                  key={index}
                  onClick={() => handlePageChange(index)}
                >
                  {index + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
              >
                <IoArrowForward />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default DetailCategory
