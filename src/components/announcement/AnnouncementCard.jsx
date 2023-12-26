import React from 'react'
import { useNavigate } from 'react-router-dom'
import { IoEyeOutline } from 'react-icons/io5'
import { BsPencilSquare } from 'react-icons/bs'
import { NumericFormat } from 'react-number-format'

export default function AnnouncementCard({ announcement }) {
  const navigate = useNavigate()
  return (
    <div className="flex text-sm bg-white border-[1px] border-[rgba(90,86,86,0.08)] h-[15vh]">
      <div className="">
        <img
          className="h-[15vh] lg:w-[7.5vw] sm:w-[25vw] object-cover"
          src={announcement?.images[0]}
          alt=""
        />
      </div>
      <div className="p-5 lg:w-[70%] sm:w-[70%]">
        <div>
          <div className="truncate font-light lg:w-[100%] sm:w-[100%]">
            <span>{announcement.name}</span>
          </div>
          <div className="truncate font-extralight text-sm">
            <span className="">{announcement.description}</span>
          </div>
        </div>

        <div className="flex items-center font-black justify-between pt-3 w-[100%]">
          <div>
            <span className="font-semibold">
              <NumericFormat
                value={announcement?.price}
                displayType={'text'}
                thousandSeparator=" "
              />{' '}
              fc
            </span>
          </div>
          <div className="flex justify-between">
            <div className="pr-2 text-sm">
              <IoEyeOutline
                onClick={() =>
                  navigate(`/Account/announcements/${announcement._id}`)
                }
              />
            </div>

            <div className="text-sm">
              <BsPencilSquare
                onClick={() =>
                  navigate(`/Account/announcements/edit/${announcement._id}`)
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
