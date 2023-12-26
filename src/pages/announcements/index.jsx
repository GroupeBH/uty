import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BsPlusCircle } from 'react-icons/bs'
import { IoArrowBack, IoArrowForward } from 'react-icons/io5'
import AnnouncemmentCard from '../../components/announcement/AnnouncementCard'
import { getAnnouncementsBySeller } from '../../services/Announcements/get-announcementsBySeller'

const itemsPerPage = 12
export default function index() {
  const navigate = useNavigate()
  const [myAnnouncements, setMyAnnouncements] = React.useState([])
  const data = JSON.parse(localStorage.getItem('seller'))

  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  useEffect(() => {
    if (data) {
      getAnnouncementsBySeller(data, setMyAnnouncements)
    }
  }, [])

  useEffect(() => {
    setTotalPages(Math.ceil(myAnnouncements.length / itemsPerPage))
  }, [myAnnouncements])

  const items = myAnnouncements.slice(
    currentPage * itemsPerPage,
    currentPage * itemsPerPage + itemsPerPage
  )

  return (
    <div className="px-[16px] md:px-0 w-[100%]">
      <div className="flex justify-between items-center pb-5 md:justify-between pt-20 md:pt-0 md:items-center w-[100%]">
        {myAnnouncements.length > 0 && (
          <div className="md:text-xl text-sm font-poppins">
            <h3>Liste de mes annonces</h3>
          </div>
        )}
        <div>
          <button
            className="bg-primary md:mt-0 py-[5px] px-2 md:py-2 md:px-4 text-light text-white text-sm rounded-lg flex items-center"
            onClick={() => navigate('/Account/announcements/create')}
          >
            {/* <span className="pr-1">
              <BsPlusCircle />
            </span> */}
            <span>Publiez une annonce</span>
          </button>
        </div>
      </div>
      {myAnnouncements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {items?.map((announcement) => {
            return (
              <AnnouncemmentCard
                key={announcement?._id}
                announcement={announcement}
              />
            )
          })}

          <div className="flex items-center justify-center w-[60vw] gap-3">
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
        <div className="text-[17px] font-medium">
          {/* {"Pas d' annonces trouvées."} */}
          {"Vous n'avez pas encore publié des annonces pour le moment"}
        </div>
      )}
    </div>
  )
}
