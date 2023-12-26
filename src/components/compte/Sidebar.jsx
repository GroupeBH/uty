import React, { useEffect } from 'react'
import { SidebarData, SidebarSeller } from './SidebarData'
import SubMenu from './SubMenu'
import _ from 'lodash'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import utyLogo from '../../assets/logo/Logo uty Web PC LITE  blanc.png'

export default function Sidebar({ active, setActive }) {
  const checkSeller = JSON.parse(localStorage.getItem('seller'))
  const [links, setLinks] = useState(SidebarData)
  const navigate = useNavigate()

  console.log('SidebarData : ')

  useEffect(() => {
    if (checkSeller) {
      _.remove(SidebarData, (data) => data.title === 'Devenir vendeur')
      setLinks(_.concat(SidebarData, SidebarSeller))
      console.log('SidebarData: ', links)
    }
  }, [checkSeller])

  return (
    <div className="h-100vh pt-1 px-10 bg-primary">
      <div className="flex flex-col">
        <div
          className="mb-5 mt-10 self-center cursor-pointer"
          onClick={() => navigate('/')}
        >
          <img src={utyLogo} alt="" className="text-center h-[150px]" />
        </div>
        {links.map((item, index) => {
          return (
            <SubMenu
              item={item}
              active={active}
              setActive={setActive}
              key={index}
            />
          )
        })}
      </div>
    </div>
  )
}
