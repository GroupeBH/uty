import React, { useEffect, useRef, useState } from 'react'
import Sidebar from '../components/compte/Sidebar'
import { Routes, Route, useMatch } from 'react-router-dom'
import Announcements from './announcements/index'
import CreateAnnouncement from './announcements/create'
import Seller from './sellers/Seller'
import EditAnnouncement from './announcements/Edit'
import AnnouncementDetail from './announcements/Detail'
import WantedList from '../pages/orders/WantedList'
import ProposalForm from '../pages/proposals/Create'
import Proposals from '../pages/proposals'

import { IoClose } from 'react-icons/io5'
import { IoMenu } from 'react-icons/io5'
import SubscribeSeller from './subcribes/SubscribeSeller'
import Offers from './orders/Offers'
import OfferDetail from '../pages/orders/OfferDetail'
import UserInfos from '../components/compte/UserInfos'
import Chat from './chats/Chat'

export default function UserDashboard() {
  const path = useMatch('/Account')
  //Get Size Screen
  const windowWidth = useRef(window.innerWidth).current

  //State
  const [active, setActive] = useState(false)

  const handleActiveSidebar = () => {
    if (active) {
      setActive(false)
    } else {
      setActive(true)
    }
  }
  // absolute top-0 bottom-0 left-[-392px]
  useEffect(() => {
    console.log('path :', path)
  })
  return (
    <div className="flex flex-col relative z-10">
      <div className="h-[100vh] flex">
        {windowWidth < 768 ? (
          <div className="fixed z-20 text-[black] px-3 py-2 bg-[white] font-bold text-2xl flex left-0 right-0 top-0">
            {active ? (
              <div className="flex flex-row">
                <IoClose
                  className="text-[40px] "
                  onClick={handleActiveSidebar}
                />
                <div className="text-[18px] font-light pl-3 pt-1">
                  Mon espace
                </div>
              </div>
            ) : (
              <div className="flex flex-row">
                <IoMenu
                  className="text-[40px] "
                  onClick={handleActiveSidebar}
                />
                <div className="text-[18px] font-light pl-3 pt-1">
                  Mon espace
                </div>
              </div>
            )}
          </div>
        ) : (
          ''
        )}
        <div
          className={
            active
              ? 'transition-all bg-primary delay-700 ease-out shadow-bth md:w-[25%] absolute top-0 bottom-0 left-[0px] md:static'
              : ' w-[0%] md:w-[25%] bg-primary absolute top-0 bottom-0 left-[-220px] shadow-bth md:static'
          }
        >
          <Sidebar active={active} setActive={setActive} />
        </div>
        <div
          className={
            active
              ? 'bg-gray-100 w-[5%] h-auto md:w-[80%]'
              : ' bg-gray-100 md:bg-slate-100 h-auto md:w-[100%]'
          }
        >
          <div className="flex md:h-[100vh] md:bg-gray-200 justify-center items-center mt-[0px] md:mt-0">
            <div
              className={
                active
                  ? 'hidden md:w-[85%] h-[auto] bg-white   md:bg-white ml-52 md:p-10'
                  : 'w-screen md:w-[85%] py-3 h-[auto] bg-white   md:bg-[#f1f5f9]  md:p-10'
              }
            >
              <Routes>
                <Route path="/" element={<UserInfos />} />
                <Route path="profile" element={<UserInfos />} />
                <Route path="seller" element={<Seller active={active} />} />
                <Route path="subscription" element={<SubscribeSeller />} />
                <Route path="announcements" element={<Announcements />} />
                <Route
                  path="announcements/create"
                  element={<CreateAnnouncement />}
                />
                <Route
                  path="announcements/edit/:id"
                  element={<EditAnnouncement />}
                />
                <Route
                  path="announcements/:id"
                  element={<AnnouncementDetail />}
                />
                <Route path="products-wanted" element={<WantedList />} />
                <Route path="products-wanted/:id" element={<ProposalForm />} />
                <Route path="propositions" element={<Proposals />} />
                <Route path="offers" element={<Offers />} />
                <Route path="offers/:id" element={<OfferDetail />} />
                <Route path="chat" element={<Chat />} />
              </Routes>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
