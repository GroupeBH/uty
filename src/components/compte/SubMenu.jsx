import React from 'react'
import { Link } from 'react-router-dom'

export default function SubMenu({ item, setActive }) {
  return (
    <Link
      className="flex items-center text-[20px]"
      to={item.path}
      onClick={() => setActive(false)}
    >
      <div className="flex text-white items-center">
        <div className="mr-3 mb-3 md:text-[14px] text-secondary font-extralight">
          {item.icon}
        </div>
        <div className=" mb-3 font-light md:text-[14px] ">{item.title}</div>
      </div>
    </Link>
  )
}
