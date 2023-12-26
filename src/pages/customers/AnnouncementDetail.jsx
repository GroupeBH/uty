import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAnnouncement } from '../../services/Announcements/getAnnouncement'

import ImageCarroussel from '../../components/ImageCarroussel'
import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'
import { NumericFormat } from 'react-number-format'
import Nav from '../../components/Layout/Nav'
// import { useStore } from '../../utils/Store'

// import { getTokenFromFirebase, onMessageListener } from '../../firebase'

// import { updateToken } from '../../services/Users/update-token-firebase'

function AnnouncementDetail() {
  // let currentUser = JSON.parse(localStorage.getItem('currentUser'))
  const params = useParams()

  const [announcement, setAnnouncement] = useState()

  // let tokenFirebase = useStore((state) => state.tokenFirebase)
  // let updateTokenFirebase = useStore((state) => state.updateTokenFirebase)

  // useEffect(() => {
  //   if (currentUser.haveTokenFirebase === 'false') {
  //     Notification.requestPermission().then((permission) => {
  //       if (permission === 'granted') {
  //         getTokenFromFirebase(updateTokenFirebase)
  //       }
  //     })
  //   } else {
  //     onMessageListener()
  //   }
  // }, [])

  // useEffect(() => {
  //   console.log('firebase token : ', tokenFirebase)
  //   console.log('user : ', currentUser.username)
  //   updateToken(currentUser, tokenFirebase)
  // }, [tokenFirebase])
  const navigate = useNavigate()

  const currentUser = JSON.parse(localStorage.getItem('currentUser'))

  useEffect(() => {
    console.log(params)
    getAnnouncement(params.id, setAnnouncement)
  }, [])

  const data = {
    senderId: currentUser?._id,
    receiverId: announcement?.seller?.user,
  }
  const handleConversation = async () => {
    if (currentUser) {
      const chat = await axios.post(`${BASE_URL}/api/chat/create-chat`, data)
      try {
        if (chat.data.message === 'success') {
          console.log('chat : ', chat)
          navigate('/Account/chat')
        }
      } catch (err) {
        console.log(err)
      }
    } else {
      navigate('/sign-in')
    }
  }

  return (
    <div className="flex flex-col">
      <div>
        <Nav />
      </div>
      <div className="h-screen text-sm items-center pt-[56px] px-6 md:px-16 md:pt-[200px]">
        <div className="flex flex-col md:flex-row ">
          <h1 className="text-sm pt-5 pb-3 md:hidden">
            {announcement?.category && (
              <p className="text-sm text-light">
                Categorie--
                <span className="text-poppins">
                  {announcement?.category.name}
                </span>
              </p>
            )}
          </h1>
          <div className="w-full mb-5 md:w-1/2">
            <div className="md:w-[90%]">
              <ImageCarroussel images={announcement?.images} />
            </div>
          </div>
          <div className="w-full md:w-1/2 px-4 pb-5 text-[1.09rem] leading-8 flex flex-col justify-center">
            <h1 className="hidden text-[1.4rem] pb-5 text-[rgb(46,43,43)] md:block font-semibold pt-8 py-2">
              {announcement?.category
                ? 'Categorie ' + announcement?.category.name
                : ''}
            </h1>
            <div>
              <h5 className="text-2xl text-[rgb(42, 39, 39)] md:mb-0 font-poppins md:block">
                {announcement?.name
                  ? announcement?.name
                  : 'Pas de nom pour ce produit'}
              </h5>
            </div>
            <div className="">
              {announcement?.description ? (
                <p className="text-sm mt-5 md:mt-2 md:text-sm md:pb-3 font-robotto">
                  {announcement.description}
                </p>
              ) : (
                ''
              )}
              <p className="pb-2">
                {announcement?.seller?.store ? (
                  <div>
                    <span className="font-normal">Produit vendu par</span>
                    <span className="text-[#00146f] font-medium">
                      {' ' + announcement?.seller?.store}
                    </span>
                  </div>
                ) : (
                  ''
                )}
              </p>
            </div>
            <div className="text-3xl text-gray-700">
              <span className="font-semibold">
                <NumericFormat
                  value={announcement?.price}
                  displayType={'text'}
                  thousandSeparator=" "
                />{' '}
                fc
              </span>
            </div>
            <div
              className=" bg-primary mt-7 rounded-[4px] py-2 md:py-1 hover:bg-[rgba(0,35,157,0.87)] transition-all delay-100 ease-in-out cursor-pointer px-3 md:w-[45%] text-center shadow-bth text-white"
              onClick={handleConversation}
            >
              Chatter avec le vendeur
            </div>
          </div>
        </div>
      </div>
      {/* <div className="">
        <Footer />
      </div> */}
    </div>
  )
}

export default AnnouncementDetail
