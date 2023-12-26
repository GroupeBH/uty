import React from 'react'
import emptyImage from '../assets/emptyImage.png'
import { useNavigate } from 'react-router-dom'
import { NumericFormat } from 'react-number-format'

function ItemProduct({ data, loader }) {
  const slicedData = data?.slice(-500).reverse()
  const navigate = useNavigate()

  return loader ? (
    <>
      {slicedData?.map((announce) => (
        <div
          key={announce._id}
          onClick={() => navigate(`/announcements/${announce._id}`)}
          className="flex flex-col cursor-pointer mb-3 border-[0.001rem] w-[95%] lg:w-[90%] rounded-[8px] pb-6 shadow-[0_0_0_rgba(48, 48, 49, 0.3)] hover:shadow-[0_0_15px_rgba(20,_20,_20,_0.2)] transition-all ease-in-out delay-150 md:w-[19%] md:h-[auto] "
        >
          <div className="text-center h-[90px] flex justify-center">
            {loader ? (
              <>
                {announce?.images[0] ? (
                  <img
                    src={announce?.images[0]}
                    alt=""
                    className="w-[100%] h-[150px] rounded-t-[5px] object-cover md:w-[100%] md:h-[195px]"
                  />
                ) : (
                  <img
                    src={emptyImage}
                    alt=""
                    className="w-[100%] h-[150px] rounded-t-[5px] object-cover md:w-[100%] md:h-[195px]"
                  />
                )}
              </>
            ) : (
              <div className="loading-spinner"></div>
            )}
          </div>
          <div className="px-3 md:mt-[45px]">
            <div className="text-[15px] truncate pt-20 pb-2 font-poppins text-[rgba(0,0,0,0.65)] md:pb-1">
              {/* <div className="hidden md:w-1 md:h-1 md:bg-secondary md:mr-1 md:block rounded-full"></div> */}
              {announce.name}
            </div>
            <div className="text-[13px] font-light truncate pb-2 text-[rgba(0,0,0,0.65)] md:pb-0">
              {announce.description}
            </div>
            <div className="flex">
              <span className="text-[rgba(0,0,0,0.65)] md:pt-2 text-lg font-black">
                <NumericFormat
                  value={announce?.price}
                  displayType={'text'}
                  thousandSeparator=" "
                />{' '}
                fc
              </span>
            </div>
          </div>
        </div>
      ))}
    </>
  ) : (
    <div className="loading-spinner"></div>
  )
}

export default ItemProduct
