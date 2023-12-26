import React, { useEffect, useState } from 'react'
import UserChat from '../../assets/profil.png'
import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

function Conversation({ data, currentUser }) {
  // const lastMessage = messages?.messages?.slice(-1).reverse()
  // console.log('lastMessage : ', lastMessage)
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
    <>
      <div className="bg-[#fafafa]">
        <div className=" flex py-4 md:py-2 px-2">
          <div className="w-[42px] h-[42px] md:w-[40px] md:h-[40px] mr-2">
            <img
              src={UserChat}
              alt=""
              className="w-[42px] h-[42px] md:w-[40px] md:h-[40px] object-cover object-center rounded-full"
            />
          </div>
          <div>
            <div className="text-[15px] md:text-[14px]">{user?.username}</div>
            <div className="text-[11px] font-light">{'UTY'}</div>
          </div>
        </div>
        <hr></hr>
      </div>
    </>
  )
}

export default Conversation
