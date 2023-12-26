import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getAnnouncements } from '../../services/Announcements/get-announcements'
import { IoArrowBack, IoArrowForward } from 'react-icons/io5'
import _ from 'lodash'
import loaderIcon from '../../assets/loader.gif'
import ItemProduct from '../../components/ItemProduct'
import Nav from '../../components/Layout/Nav'

const itemsPerPage = 12
export default function SearchResults() {
  const params = useParams()
  const [loader, setLoader] = useState(false)
  const [products, setProducts] = useState([])
  const [results, setResults] = useState([])

  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  useEffect(() => {
    getAnnouncements(setProducts, setLoader)
  }, [])

  useEffect(() => {
    setResults(
      _.filter(products, (product) =>
        product.name.toLowerCase().includes(params.id.toLowerCase())
      )
    )

    setTotalPages(Math.ceil(results.length / itemsPerPage))
  }, [products, results])

  const items = results.slice(
    currentPage * itemsPerPage,
    currentPage * itemsPerPage + itemsPerPage
  )
  return (
    <div>
      <div>
        <Nav />
      </div>
      <div className="pt-20">
        {loader ? (
          <div className="md:px-12 px-5 py-5">
            <div className="mb-3">
              <p>
                <span>{_.size(results) + ' '}</span>resultats correspondant à :{' '}
                <span>{params.id}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6">
              {items && <ItemProduct data={items} loader={loader} />}
            </div>

            <div className="flex items-center justify-center w-[100%] gap-3">
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
          </div>
        ) : (
          <div className="flex justify-center items-center h-[80vh] w-[100vw]">
            <img className="h-[10vh]" src={loaderIcon} />
          </div>
        )}
      </div>
    </div>
  )
}
