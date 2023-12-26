import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { IoEyeOutline } from 'react-icons/io5'
import { IoArrowBack } from 'react-icons/io5'
import { FiUser } from 'react-icons/fi'
import { BASE_URL } from '../../helpers/Root'

function Login() {
  const navigate = useNavigate()
  const [values, setValues] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [isHide, setIsHide] = useState(false)

  const connexion = 'Connectez-vous'

  useEffect(() => {
    const items = JSON.parse(localStorage.getItem('currentUser'))
    items !== null ? navigate('/') : navigate('/sign-in')
  }, [])

  const hidePassword = () => {
    if (isHide) {
      setIsHide(false)
    } else {
      setIsHide(true)
    }
  }

  const toastOptions = {
    position: 'bottom-right',
    autoClose: 8000,
    pauseOnHover: true,
    draggable: true,
    theme: 'dark',
  }

  const handleChange = (event) => {
    setValues({ ...values, [event.target.name]: event.target.value })
  }

  const validateForm = () => {
    const { username, password } = values
    if (username === '') {
      toast.error('Email and Password is required.', toastOptions)
      setLoading(false)
      return false
    } else if (password === '') {
      toast.error('Email and Password is required.', toastOptions)
      setLoading(false)
      return false
    }
    return true
  }
  //https://uty-ti30.onrender.com
  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    if (validateForm()) {
      const { username, password } = values
      const { data } = await axios.post(`${BASE_URL}/api/auth/login`, {
        username,
        password,
      })
      console.log(data)

      try {
        if (data.status === true) {
          if (data.user.tokenFirebase) {
            data.user.haveTokenFirebase = 'true'
          }
          localStorage.setItem('currentUser', JSON.stringify(data.user))
          if (data.seller !== null) {
            localStorage.setItem('seller', JSON.stringify(data.seller))
          }
          navigate('/')
          setLoading(false)
        } else {
          setLoading(false)
          toast.error(data.msg, toastOptions)
        }
      } catch (err) {
        console.log(err)
      }
    }
  }

  return (
    <>
      <div className=" flex bg-uty-signup justify-center h-[100vh] md:justify-center items-center gap-1">
        <div className="px-6 md:px-10 rounded-lg items-center bg-[#f8fafc] pb-10 pt-3 shadow-3xl">
          <div className="flex items-center gap-2 text-center text-primary text-[13px] py-6">
            <IoArrowBack className="text-primary" />
            <Link to={'/home'}>{'Accueil'}</Link>
          </div>
          <h2 className="text-center text-primary font-medium text-2xl">
            {'Se connecter'}
          </h2>

          <form action="" onSubmit={(event) => handleSubmit(event)}>
            <div className="relative flex flex-col mt-10 gap-3 md:mb-5 md:mt-8">
              <div className="md:bg-white rounded-[2px]">
                <input
                  type="text"
                  className="border-[1px] pl-2 pr-6 border-[rgba(90,86,86,0.08)] py-[10px] w-full outline-none text-[15px] text-[rgba(0,0,0,0.67)] md:py-[7px] rounded-[2px]"
                  placeholder="Username"
                  name="username"
                  onChange={(e) => handleChange(e)}
                />
                <FiUser className="absolute text-primary top-[13px] right-0 text-[12px] md:top-[14px] mr-2" />
              </div>

              <div className="relative flex md:bg-white rounded-[2px]">
                <input
                  className="border-[1px] pl-2 pr-6 border-[rgba(90,86,86,0.08)] py-[10px] w-full outline-none text-[15px] text-[rgba(0,0,0,0.67)] md:py-[7px] rounded-[2px]"
                  type={isHide ? 'text' : 'password'}
                  placeholder="Password"
                  name="password"
                  onChange={(e) => handleChange(e)}
                />
                <IoEyeOutline
                  className="absolute text-primary top-[13px] right-0 text-[12px] md:top-[14px] mr-2"
                  onClick={hidePassword}
                />
              </div>
              <div className=" py-[10px] text-white text-[15px] bg-primary text-center md:py-[7px] rounded-[2px]">
                <button className="" type="submit">
                  {loading ? (
                    <div className="">Vérification...</div>
                  ) : (
                    <div className="">{connexion}</div>
                  )}
                </button>
              </div>
              <div className="mt-1 md:mt-8 text-[15px] text-center">
                <p>
                  <span
                    onClick={() => navigate('/sign-up')}
                    className="text-primary mr-1 cursor-pointer underline"
                  >
                    Creer un compte
                  </span>
                  <span className="text-[#363434]">si vous en avez pas</span>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
      <ToastContainer />
    </>
  )
}

export default Login
