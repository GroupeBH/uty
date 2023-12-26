import React from 'react'
import { useNavigate } from 'react-router-dom'

function ItemCategories({ data, containerRef, loader }) {
  const navigate = useNavigate()

  return loader ? (
    <div className="flex overflow-x-auto " ref={containerRef}>
      {data.map((category) => (
        <div
          key={category._id}
          className="w-[190px] mr-5 my-1 md:w-[230px] rounded cursor-pointer relative bg-white border-[0.001rem] hover:shadow-[0_0_15px_rgba(20,_20,_20,_0.2)] shadow-[0_0_0_rgba(48, 48, 49, 0.3)]  transition-all ease-in-out delay-150 shrink-0 md:mr-8 py-3 md:ml-0"
          onClick={() => navigate(`/announcements/category/${category?._id}`)}
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
              <h2 className="">{category?.name}</h2>
            </div>
            <div className="text-[#5a343c] text-[13px] mb-2 md:w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
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
  )
}

export default ItemCategories
