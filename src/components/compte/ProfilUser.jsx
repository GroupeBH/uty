import React, { useEffect, useState } from 'react'
import ProfilUser from '../../assets/profileuser.png'
import { FiEdit } from 'react-icons/fi'
import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

function UpdateProfilUser({ user }) {
  //States
  const [file, setFile] = useState(null)
  const [username, setUsername] = useState(null)
  const [email, setEmail] = useState(null)
  const [phone, setPhone] = useState(null)
  const [image, setImage] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [loader, setLoader] = useState(false)
  const [msgErr, setMsgErr] = useState(false)

  console.log(user?._id)
  const userId = user?._id
  const currentImage = user?.image
  console.log('userId : ', userId)

  useEffect(() => {
    setUsername(user?.username)
    setEmail(user?.email)
    setPhone(user?.phone)
  }, [user])

  console.log(image)

  function handleChange(e) {
    setSelectedImage(e.target.files[0])
    setFile(URL.createObjectURL(e.target.files[0]))
  }

  useEffect(() => {
    if (selectedImage) {
      const reader = new FileReader()
      reader.readAsDataURL(selectedImage)
      reader.onloadend = () => {
        setImage(reader.result)
      }
    }
  }, [selectedImage])

  const handleUpdateUser = async () => {
    setLoader(true)

    const userData = await axios.patch(
      `${BASE_URL}/api/auth/update-user/${userId}`,
      { username, phone, email, image, lastImage: currentImage }
    )

    try {
      if (userData.data.message === 'success') {
        setLoader(false)

        console.log('user', userData.data.message)
        localStorage.setItem('currentUser', JSON.stringify(userData.data.user))
      } else {
        console.log('userData.response : ', userData.response)
        setMsgErr('cicicici')
        setLoader(false)
      }
    } catch (err) {
      console.log('ici : ', err.response)
    }
  }
  return (
    <div className=" bg-white md:h-[550px] px-3 shadow-[0_0px_20px_-15px_rgba(0,0,0,0.3)] rounded-2xl md:p-3">
      <div className="relative">
        {!file ? (
          <img
            src={user?.image ? user?.image : ProfilUser}
            alt=""
            className="rounded-lg h-[42vh] md:h-[38vh] w-[100%] object-cover absolute"
          />
        ) : (
          <img
            src={file}
            alt=""
            className="rounded-lg h-[38vh] w-[100%] object-cover absolute"
          />
        )}
        <div className="flex absolute bg-white right-0 bottom-[-278px] md:bottom-[-254px] p-[10px] md:p-[2px] round ">
          <div className="flex relative md:top-1 left-1 cursor-pointer hover:text-primary font-bold transition-all delay-150 ease-in-out">
            <FiEdit className="text-[20px]" />
            <input
              type="file"
              accept="image/png, image/jpg, image/jpeg"
              className="w-5 h-5 absolute top-[0px] opacity-0"
              onChange={handleChange}
            />
          </div>
        </div>
      </div>
      <div className=" flex justify-between pt-[290px] px-4 md:px-0 md:pt-[265px]">
        <span className="text-[16px] font-medium">
          {username || user?.username}
        </span>
        <div className="flex flex-col text-[11px] pt-[6px]">
          <span>{email || user?.email}</span>
          <span>{phone || user?.phone}</span>
        </div>
      </div>
      <div className=" leading-6 mt-8">
        <div>
          <input
            type="text"
            value={username}
            className="text-[rgb(0,0,0,0.69)] text-[15px] outline-none border-b-gary-400 border-b-[1px] mb-3 focus:border-b-primary transition-all delay-150 ease-in-out px-2"
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <input
            type="text"
            value={phone}
            className="text-[rgb(0,0,0,0.69)] text-[15px] outline-none border-b-gary-400 border-b-[1px] mb-3  focus:border-b-primary transition-all delay-150 ease-in-out px-2"
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <input
            type="text"
            value={email}
            className="text-[rgb(0,0,0,0.69)] text-[15px] outline-none border-b-gary-400 border-b-[1px] mb-3  focus:border-b-primary transition-all delay-150 ease-in-out px-2"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex mt-7 pb-5 md:pb-0">
          <div
            onClick={handleUpdateUser}
            className="bg-primary cursor-pointer text-[14px] md:m-auto text-white inline-block py-1 px-7 rounded-[3px]"
          >
            {loader ? 'Encours...' : ' Modifier'}
          </div>
        </div>
      </div>
      <div>{msgErr}</div>
    </div>
  )
}

export default UpdateProfilUser
