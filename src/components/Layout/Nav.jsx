import React, { useState, useEffect } from 'react'
import Menu from '../Menu'
import { useNavigate } from 'react-router-dom'
import Profil from '../../assets/profil.jpg'
import { AiOutlineMessage } from 'react-icons/ai'
import { IoSearchSharp } from 'react-icons/io5'

function Nav() {
  const navigate = useNavigate()
  const [isConnected, setIsConnected] = useState(false)
  const [isShow, setIsShow] = useState(false)
  const currentUser = JSON.parse(localStorage.getItem('currentUser'))
  const currentSeller = JSON.parse(localStorage.getItem('seller'))

  const [query, setQuery] = useState()

  useEffect(() => {
    if (currentUser !== null) {
      setIsConnected(true)
    }
  })

  const handleSubmitSearch = (event) => {
    event.preventDefault()
    navigate(`/products/${query}`)
  }

  const showModal = () => {
    if (isShow) {
      setIsShow(false)
    } else {
      setIsShow(true)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    localStorage.removeItem('seller')
    navigate('/')
  }

  const navigation = currentUser
    ? [
        { name: 'Accueil', href: '/', current: true },
        { name: 'Mon espace', href: '/Account', current: false },
        { name: 'Categories', href: '/categories', current: false },
      ]
    : [
        { name: 'Accueil', href: '/', current: true },
        { name: 'Categories', href: '/categories', current: false },
      ]
  return (
    <div className="px-[16px] flex justify-between items-center shadow-md bg-white fixed z-50 left-0 right-0 md:px-16 h-16 md:16">
      <div onClick={() => navigate('/')} className="cursor-pointer">
        <h2 className="page__title font-bold text-[28px] leading-5 font-payton lowercase">
          <span className="text-primary mr-[2px]">U</span>
          <span className="text-secondary mr-[3px]">T</span>
          <span className="text-primary mr-[3px]">Y</span>
        </h2>
      </div>

      <div className="mr-2">
        <form onSubmit={(event) => handleSubmitSearch(event)}>
          <label
            htmlFor="default-search"
            className="mb-2 text-sm font-medium text-gray-900 sr-only"
          >
            Search
          </label>
          <div className="relative px-2">
            <input
              type="search"
              id="default-search"
              className="block w-full md:w-[30vw] p-2 text-sm border border-[rgba(90,86,86,0.08)] rounded-xl focus:border-0'"
              placeholder="Trouver un produit..."
              onChange={(e) => setQuery(e.target.value)}
              required
            />
            <button
              type="submit"
              className="absolute top-0 end-0 p-2.5 text-sm font-medium h-full text-white bg-blue-700 rounded-e-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              <IoSearchSharp />
            </button>
          </div>
        </form>
      </div>
      {currentUser ? (
        <>
          <div className="hidden md:flex md:gap-8 md:font-normal md:text-[rgba(0,0,0,0.83)]">
            {navigation.map((item) => (
              <div
                onClick={() => {
                  navigate(item.href)
                }}
                key={item.name}
                className={
                  item.current
                    ? ' md:cursor-pointer md:hover:text-secondary md:transition-all md:delay-200 md:ease-in-out'
                    : 'md:cursor-pointer md:hover:text-secondary md:transition-all md:delay-200 md:ease-in-out'
                }
              >
                {item.name}
              </div>
            ))}
            {!currentSeller ? (
              <div
                className="md:cursor-pointer md:hover:text-secondary md:transition-all md:delay-200 md:ease-in-out"
                onClick={() => navigate('/Account/seller')}
              >
                Passer une annonce
              </div>
            ) : (
              <div
                className="md:cursor-pointer md:hover:text-secondary md:transition-all md:delay-200 md:ease-in-out"
                onClick={() => navigate('/Account/announcements')}
              >
                Passer une annonce
              </div>
            )}
          </div>
          <div className=" md:relative">
            <div className="flex items-center">
              <div
                className="mr-2 cursor-pointer hover:opacity-90"
                onClick={() => navigate('/Account/chat')}
              >
                <AiOutlineMessage className="text-[35px] font-light text-[rgba(0,35,158,078)]" />
              </div>
              <img
                src={!currentUser.image ? Profil : currentUser.image}
                alt="profil"
                className="hidden md:w-9 md:h-9 md:object-cover md:rounded-full md:cursor-pointer md:block"
                onClick={showModal}
              />
            </div>
            {isShow ? (
              <div className=" md:absolute md:w-36 md:bg-[white] md:text-[black]  md:text-[13px] md:left-[-54px] md:top-[45px] md:shadow-profil md:text-center ">
                <div
                  className="md:pb-1 cursor-pointer py-2 font-bold hover:bg-[#cccaca] transition-all delay-150 ease-in-out"
                  onClick={() => navigate('/Account/profile')}
                >
                  {currentUser?.username}
                </div>
                <hr className=""></hr>
                <div
                  className="cursor-pointer pb-2  pt-1 font-light hover:bg-[#cccaca] transition-all delay-150 ease-in-out"
                  onClick={handleLogout}
                >
                  {'Se deconnecter'}
                </div>
              </div>
            ) : (
              ''
            )}
          </div>
        </>
      ) : (
        <>
          <div className="hidden md:flex md:gap-8 md:font-normal md:text-[rgba(0,0,0,0.83)]">
            {navigation.map((item) => (
              <div
                onClick={() => {
                  navigate(item.href)
                }}
                key={item.name}
                className={
                  item.current
                    ? ' cursor-pointer hover:text-secondary transition-all delay-200 ease-in-out'
                    : 'cursor-pointer hover:text-secondary transition-all delay-200 ease-in-out'
                }
              >
                {item.name}
              </div>
            ))}
          </div>
          <div
            className="hidden md:flex md:items-center md:bg-primary md:hover:bg-[rgba(0,35,158,0.86)] md:transition md:delay-200 md:cursor-pointer md:ease-in-out md:text-white md:font-medium md:px-4 py-[6px] md:rounded-[7px] md:text-[15px]"
            onClick={() => navigate('/sign-in')}
          >
            <div className="w-2 h-2 bg-secondary rounded-full mr-1"></div>Se
            connecter
          </div>
        </>
      )}
      <Menu
        isConnected={isConnected}
        setIsConnected={setIsConnected}
        currentUser={currentUser}
      />
    </div>
  )
}

export default Nav
