import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { BASE_URL } from '../../helpers/Root'
import UserChat from '../../assets/profil.png'
import { FaArrowLeft } from 'react-icons/fa'

function HeaderChat({ data, currentUser, setChat }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const userId = data.members.find((id) => id !== currentUser)
    const getUser = async () => {
      const userData = await axios.get(`${BASE_URL}/api/auth/getUser/${userId}`)
      setUser(userData.data)
    }
    getUser()
  }, [currentUser, data])

  return (
    <div className="fixed left-0 right-0 top-0 z-40 md:static bg-[#6173ae] items-center py-3 px-2 flex md:py-2 ">
      <div className="md:hidden mr-3 text-white" onClick={() => setChat(null)}>
        <FaArrowLeft />
      </div>
      <div className="w-[45px] h-[45px] md:w-[40px] md:h-[40px] mr-2">
        <img
          src={user?.image ? user?.image : UserChat}
          alt=""
          className="w-[45px] h-[45px] md:w-[40px] md:h-[40px] object-cover object-center rounded-full"
        />
      </div>
      <div>
        <div className="text-[15px] font-medium tracking-[1px] md:text-[14px] text-[#e2e2e2]">
          {user?.username}
        </div>
        <div className="text-[11px] font-light text-[white]">En ligne</div>
      </div>
    </div>
  )
}

export default HeaderChat
