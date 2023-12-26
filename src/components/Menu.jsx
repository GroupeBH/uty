import * as React from 'react'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
// import MenuItem from '@mui/material/MenuItem'
import { IoMenu } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'

export default function BasicMenu({ isConnected, setIsConnected }) {
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = React.useState(null)
  const open = Boolean(anchorEl)
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    localStorage.removeItem('seller')
    setIsConnected(false)
    handleClose()
  }

  const navigation = isConnected
    ? [
        { name: 'Accueil', href: '/', current: true },
        { name: 'Mon espace', href: '/Account', current: false },
        { name: 'Categories', href: '/categories', current: false },
        {
          name: 'Passer une annonce',
          href: '/Account/announcements',
          current: false,
        },
      ]
    : [
        { name: 'Accueil', href: '/', current: true },
        { name: 'Categories', href: '/categories', current: false },
      ]

  return (
    <div className="lg:hidden">
      <Button
        id="basic-button"
        aria-controls={open ? 'basic-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
      >
        <IoMenu style={{ fontSize: ' 375%', color: '#020664' }} />
      </Button>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <div className="p-5 h-[50vh]">
          {navigation.map((item) => (
            <div
              onClick={() => {
                navigate(item.href)
                handleClose
              }}
              key={item.name}
              className={
                item.current
                  ? 'px-3 cursor-pointer py-[5px] md:p-0 font-medium hover:bg-[rgb(0,0,255,0.27)] md:bg-white md:cursor-pointer md:hover:text-secondary md:transition-all delay-200 md:ease-in-out'
                  : 'px-3 cursor-pointer py-[5px] md:p-0 font-medium hover:bg-[rgb(0,0,255,0.27)] md:bg-white md:cursor-pointer md:hover:text-secondary md:transition-all delay-200 md:ease-in-out'
              }
            >
              {item.name}
            </div>
          ))}
          {isConnected ? (
            <div
              className="flex w-[150px] m-auto mt-5 items-center bg-primary hover:bg-[rgba(0,35,158,0.86)] transition delay-200 cursor-pointer ease-in-out text-white font-medium px-4 py-[6px] rounded-[7px] text-[15px] md:hidden"
              onClick={handleLogout}
            >
              <div className="w-2 h-2 bg-secondary rounded-full mr-1"></div>
              {'Deconnexion'}
            </div>
          ) : (
            <div
              className="flex w-[150px] m-auto mt-5 items-center bg-primary hover:bg-[rgba(0,35,158,0.86)] transition delay-200 cursor-pointer ease-in-out text-white font-medium px-4 py-[6px] rounded-[7px] text-[15px] md:hidden"
              onClick={() => navigate('/sign-in')}
            >
              <div className="w-2 h-2 bg-secondary rounded-full mr-1"></div>
              {'Connexion'}
            </div>
          )}
        </div>
      </Menu>
    </div>
  )
}
