import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
// import ModalSign from '../../components/ModalSign'
// import Login from './Login'
import { IoArrowBack, IoCamera, IoEyeOutline } from 'react-icons/io5'
import { FiPhone } from 'react-icons/fi'
import { FiMail } from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
import { FiUser } from 'react-icons/fi'
import { BASE_URL } from '../../helpers/Root'

export default function Register() {
  const [selectedImg, setSelectedImg] = useState(null)
  const [picUrl, setPicUrl] = useState(null)
  const [url, setUrl] = useState(null)
  const [isLoad, setIsLoad] = useState(false)
  const [isHide, setIsHide] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    const items = JSON.parse(localStorage.getItem('currentUser'))
    items ? navigate('/') : navigate('/sign-up')
  }, [])

  const hidePassword = () => {
    if (isHide) {
      setIsHide(false)
    } else {
      setIsHide(true)
    }
  }

  console.log('isHide : ', isHide)

  const toastOptions = {
    position: 'bottom-right',
    autoClose: 8000,
    pauseOnHover: true,
    draggable: true,
    theme: 'dark',
  }
  const [values, setValues] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
  })

  const handleChange = (event) => {
    setValues({ ...values, [event.target.name]: event.target.value })
  }

  const handleValidation = () => {
    const { password, username } = values
    if (username.length < 2) {
      toast.error('Username should be greater than 3 characters.', toastOptions)
      setIsLoad(false)
      return false
    } else if (password.length < 8) {
      toast.error(
        'Password should be equal or greater than 8 characters.',
        toastOptions
      )
      return false
    }

    return true
  }
  const handleSubmit = async (event) => {
    setIsLoad(true)
    event.preventDefault()
    if (handleValidation()) {
      const { email, username, phone, password } = values
      const { data } = await axios.post(`${BASE_URL}/api/auth/register`, {
        username,
        email,
        phone,
        password,
        image: url,
      })

      try {
        if (data.status === true) {
          if (data.user.tokenFirebase) {
            data.user.haveTokenFirebase = 'true'
          }
          localStorage.setItem('currentUser', JSON.stringify(data.user))
          navigate('/')
        } else {
          toast.error(data.msg, toastOptions)
        }
      } catch (err) {
        console.log('err : ', err)
      }
    }
  }

  useEffect(() => {
    if (selectedImg) {
      setPicUrl(URL.createObjectURL(selectedImg))
      const reader = new FileReader()
      reader.readAsDataURL(selectedImg)
      reader.onloadend = () => {
        console.log(reader.result)
        setUrl(reader.result)
      }
    }
  }, [selectedImg])

  return (
    <>
      <div className=" flex bg-uty-signup justify-center h-[100vh] md:justify-center items-center gap-1">
        <div className="px-6 flex flex-col md:px-10 rounded-lg items-center bg-[#f8fafc] pt-10 pb-6 shadow-3xl">
          <div className="mr-auto flex items-center gap-2 text-center text-primary text-[13px] pb-3">
            <IoArrowBack className="text-primary" />
            <Link to={'/home'}>{'Accueil'}</Link>
          </div>
          <form onSubmit={(event) => handleSubmit(event)}>
            <div className="md:mb-5">
              <div className="flex justify-center md:justify-center relative pb-5">
                <div className="self-center">
                  <input
                    type="file"
                    onChange={(e) => setSelectedImg(e.target.files[0])}
                    className="absolute opacity-0 md:top-[-30px] self-center mt-[5vh] bd-primary w-[100px] overflow-hidden py-8"
                  />
                  <div className="flex justify-center items-center bg-white h-[15vh] w-[15vh] md:w-[7.5vw] rounded-[100%] text-6xl">
                    <label className="self-center text-primary" htmlFor="file">
                      {!picUrl ? (
                        <IoCamera />
                      ) : (
                        <img
                          src={picUrl}
                          alt=""
                          className="rounded-[100%] h-[15vh] w-[15vh] object-cover"
                        />
                      )}
                    </label>
                  </div>
                </div>
              </div>
              <div className="relative flex flex-col gap-3">
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
                    className="border-[1px] w-[100%] border-[rgba(90,86,86,0.08)] py-[10px] outline-none text-[15px] text-[rgba(0,0,0,0.67)] px-4 md:py-[7px] rounded-[2px] md:w-[100%]"
                    type="email"
                    placeholder="Email"
                    name="email"
                    onChange={(e) => handleChange(e)}
                  />
                  <FiMail className="absolute text-primary top-[13px] right-0 text-[12px] md:top-[14px] mr-2" />
                </div>
                <div className="relative flex md:bg-white rounded-[2px]">
                  <input
                    className="border-[1px] w-[100%] border-[rgba(90,86,86,0.08)] py-[10px] outline-none text-[15px] text-[rgba(0,0,0,0.67)] px-4 md:py-[7px] rounded-[2px] md:w-[100%]"
                    type="text"
                    placeholder="Téléphone"
                    name="phone"
                    onChange={(e) => handleChange(e)}
                  />
                  <FiPhone className="absolute text-primary top-[13px] right-0 text-[12px] md:top-[14px] mr-2" />
                </div>
                <div className="relative flex md:bg-white rounded-[2px]">
                  <input
                    className="border-[1px] w-[100%] border-[rgba(90,86,86,0.08)] py-[10px] outline-none text-[15px] text-[rgba(0,0,0,0.67)] px-4 md:py-[7px] rounded-[2px] md:w-[100%]"
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
                    {isLoad ? (
                      <div className="">Vérification...</div>
                    ) : (
                      <div className="">{"S'inscrire"}</div>
                    )}
                  </button>
                </div>
                <div className="mt-1 md:mt-8 text-[15px] text-center">
                  <p>
                    <span
                      onClick={() => navigate('/sign-in')}
                      className="text-primary mr-1 cursor-pointer underline"
                    >
                      Creer un compte
                    </span>
                    <span className="text-[#363434]">si vous en avez pas</span>
                  </p>
                </div>
              </div>
              {/* <div className="flex">
                <button
                  className="w-[70%] py-[7px] mx-auto text-white text-[15px] md:w-[100%] bg-primary text-center md:py-[3px] mt-4 rounded-[2px] md:mx-0 md:ml-[1px]"
                  type="submit"
                >
                  {isLoad ? (
                    <div className="">Vérification...</div>
                  ) : (
                    <div className="">{"S'inscrire"}</div>
                  )}
                </button>
              </div>
              <div className="mt-8 text-[15px] text-center">
                <p>
                  <span
                    onClick={() => navigate('/sign-in')}
                    className="text-primary mr-1 cursor-pointer underline"
                  >
                    connectez-vous
                  </span>
                  <span className="text-[#363434]">si vous avez un compte</span>
                </p>
              </div> */}
            </div>
          </form>
        </div>
      </div>
      <ToastContainer />
    </>
  )
}
