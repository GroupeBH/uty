import React, { useEffect, useRef, useState } from 'react'
// import axios from 'axios'
import ScrollLeft from './ScrollLeft'
import ScrollRight from './ScrollRight'
import ItemCategories from './ItemCategories'
// import { useNavigate } from 'react-router-dom'
import { getCategories } from '../services/Categories/get-categories'

function CategorySection() {
  const [categories, setCategories] = useState([])
  const [loader, setLoader] = useState(false)
  const containerRef = useRef(null)
  // const navigate = useNavigate()

  useEffect(() => {
    getCategories(setCategories, setLoader)
    console.log('checking categories')
  }, [])

  let titleCategorie = 'Toutes les categories'

  return (
    <div className="px-5 md:px-16">
      {loader ? (
        <div className="flex items-center mt-10 pb-4 justify-between relative">
          <h2 className="text-[#21344e] text-[16px] font-bold md:pt-0 capitalize md:text-[23px]">
            {titleCategorie}
          </h2>
          <div className="absolute top-6 mt-[-9px] right-0 z-20 sm:top-[8px] text-[20px] flex items-center md:mt-0">
            {/* <div
              className="text-[15px] text-primary font-medium cursor-pointer py-1 md:px-3 rounded md:hover:bg-[rgba(0,0,255,0.17)] md:block md:transition md:ease-in-out md:dalay-150 md:mr-10"
              onClick={() => navigate('/categories')}
            >
              Voir plus
            </div> */}
            {categories.length > 4 ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#dfd9d9] hover:bg-primary hover:text-[#fff] rounded-full transition ease-in-out delay-150">
                  <ScrollRight containerRef={containerRef} />
                </div>
                <div className="bg-[#dfd9d9] hover:bg-primary hover:text-[#fff]  rounded-full transition ease-in-out delay-150">
                  <ScrollLeft containerRef={containerRef} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        ''
      )}
      <div>
        <ItemCategories
          loader={loader}
          data={categories}
          containerRef={containerRef}
        />
      </div>
    </div>
  )
}

export default CategorySection
