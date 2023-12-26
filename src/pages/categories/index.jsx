import React, { useState, useEffect } from 'react'
import { getCategories } from '../../services/Categories/get-categories'
import { useNavigate } from 'react-router-dom'
import Nav from '../../components/Layout/Nav'

export default function index() {
  const [categories, setCategories] = useState([])
  const [loader, setLoader] = useState(false)
  const navigate = useNavigate()
  // const containerRef = useRef(null)

  useEffect(() => {
    getCategories(setCategories, setLoader)
  }, [])
  return (
    <div>
      <div>
        <Nav />
      </div>
      <div className="flex flex-col gap-3 lg:px-16 sm:px-5 py-20">
        <div className="flex mb-3 lg:items-center lg:flex-row lg:gap-[40vw] sm:flex-col sm:gap-3">
          <div className="text-[#383535] lg:text-2xl sm:text-lg font-medium">
            <h1>Les catégories de nos produits et services</h1>
          </div>
          {/* <div>chercher un produit</div> */}
        </div>
        <div className=" sm:h-full">
          {loader ? (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {categories.map((category) => (
                <div
                  key={category?._id}
                  className=" rounded cursor-pointer relative bg-white border-[0.001rem] hover:shadow-[0_0_15px_rgba(20,_20,_20,_0.2)] shadow-[0_0_0_rgba(48, 48, 49, 0.3)]  transition-all ease-in-out delay-150 shrink-0 py-3 md:ml-0"
                  onClick={() =>
                    navigate(`/announcements/category/${category?._id}`)
                  }
                >
                  <div className="h-[160px] mb-2 flex justify-center items-center">
                    <img
                      src={category?.icon}
                      alt=""
                      className="mx-auto object-cover h-auto object-bottom w-[35%]"
                    />
                  </div>
                  <div className="w-[85%] mx-auto">
                    <div className="font-medium absolute top-[10px] px-3 py-[3px] text-[12px] text-[rgba(31,29,29,0.87)] rounded-[5px]">
                      <h2 className="">{category.name}</h2>
                    </div>
                    <div className="text-[#5a343c] text-[13px] mb-2 md:w-[150px] truncate">
                      {category?.description}
                    </div>
                    <div className="flex justify-between text-[11px] items-center">
                      <span className="bg-primary px-3 py-[5px] text-[#ffffe8] font-medium rounded-[5px]">
                        Détail
                      </span>
                      <div className="text-[#5d6d76]">
                        {category?.announcements?.length} annonces
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="loading-spinner"></div>
          )}
        </div>
      </div>
    </div>
  )
}
