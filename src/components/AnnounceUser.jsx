import React from 'react'
import Images from '../assets/profil.png'

function AnnounceUser({ data, loader }) {
  return (
    <>
      {data?.sellers.map((seller) => (
        <div
          key={seller._id}
          className="flex flex-col justify-center items-center shrink-0 text-[rgb(233,230,230)]"
        >
          {seller.user.image && loader ? (
            <img
              src={seller?.user?.image}
              alt="profil"
              title=""
              className="rounded-[100%] border-solid border-[4px] border-[white] w-[70px] h-[70px] inline-block  m-2 cursor-pointer hover:scale-110 ease-in-out duration-300 md:w-[95px] md:h-[95px]"
            />
          ) : (
            <img
              src={Images}
              alt="profil"
              title=""
              className="rounded-[100%] border-solid border-[6px] border-[white] w-[70px] h-[70px] inline-block  m-2 cursor-pointer hover:scale-110 ease-in-out duration-300 md:w-[95px] md:h-[95px]"
            />
          )}

          <span className="text-[0.85rem] font-bold w-12 text-ellipsis overflow-hidden whitespace-nowrap">
            {seller.user.username}
          </span>
          {/* <span className="text-[0.7rem]">Il y a 10min</span> */}
        </div>
      ))}
    </>
  )
}

export default AnnounceUser
