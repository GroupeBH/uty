import React from 'react'
import UserChat from '../../assets/profil.png'

function HeaderConversation({ currentUser }) {
  return (
    <div className="bg-[#6173ae] flex items-center py-3 md:py-2 px-2 md:border-r-yellow-50 md:border-r-2 md:mt-0 mt-[45px]">
      <div className="w-[45px] h-[45px] md:w-[40px] md:h-[40px] mr-2">
        <img
          src={currentUser?.image ? currentUser.image : UserChat}
          alt=""
          className="object-cover object-center rounded-full w-[45px] h-[45px] md:w-[40px] md:h-[40px]"
        />
      </div>
      <div>
        <div className="text-[15px] md:text-[14px] font-medium tracking-[1px] md:tracking-3 text-[#e2e2e2]">
          {currentUser.username}
        </div>
        <div className="text-[11px] font-light text-[white]">En ligne</div>
      </div>
    </div>
  )
}

export default HeaderConversation
