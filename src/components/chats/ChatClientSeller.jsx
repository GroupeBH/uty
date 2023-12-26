import React, { useEffect, useRef, useState } from 'react'
import Conversation from './Conversation'
import Message from './Message'
import InputMessage from './InputMessage'
import axios from 'axios'
import { BASE_URL, BASE_URL_SOCKET } from '../../helpers/Root'
import NoChat from './NoChat'
import EmptyCanal from './EmptyCanal'
import { FiSend } from 'react-icons/fi'
import io from 'socket.io-client'
import HeaderConversation from './HeaderConversation'
import HeaderChat from './HeaderChat'
import { IoCameraOutline } from 'react-icons/io5'
import _ from 'lodash'

function ChatClientSeller() {
  const [usersChats, setUsersChats] = useState([])
  const [chat, setChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [arrivalMessage, setArrivalMessage] = useState([])
  const [text, setText] = useState('')
  const [images, setImages] = useState([])
  // const [photos, setPhotos] = useState([])
  const [imageUTLs, setImageUTLs] = useState([])
  const [showUploadImage, setShowUploadImage] = useState(false)

  const currentUser = JSON.parse(localStorage.getItem('currentUser'))
  const scrolRef = useRef(null)
  const socket = useRef()

  useEffect(() => {
    if (images?.length > 0) {
      const newImageURLs = []
      images.forEach((image) => newImageURLs?.push(URL.createObjectURL(image)))
      setImageUTLs(newImageURLs)
    }
  }, [images])

  const readFileHandler = (file) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    /*
    reader.onloadend = () => {
      setPhotos((curr) => [...curr, reader.result])
      return reader.result
    }
    */
  }

  //Upload images
  const selectFilesHandler = (e) => {
    const imagesData = []
    setImages([...e.target.files])
    setShowUploadImage(true)
    _.forEach(e.target.files, (file) => {
      imagesData.push(readFileHandler(file))
    })
  }

  useEffect(() => {
    socket.current = io(`${BASE_URL_SOCKET}`)
    socket.current.on('getMessage', (data) => {
      setArrivalMessage({
        senderId: data.senderId,
        text: data.text,
        images: data.images,
        createdAt: Date.now(),
      })
    })
  }, [socket])

  useEffect(() => {
    arrivalMessage &&
      chat?.members?.includes(arrivalMessage?.senderId) &&
      setMessages((prev) => [...prev, arrivalMessage])
  }, [arrivalMessage, chat])

  useEffect(() => {
    socket.current.emit('addUser', currentUser._id)
  }, [currentUser])

  const getChat = async () => {
    const dataChats = await axios.get(
      `${BASE_URL}/api/chat/find/${currentUser._id}`
    )
    try {
      if (dataChats.data.message === 'success') {
        setUsersChats(dataChats.data)
      }
    } catch (err) {
      console.log(err)
    }
  }

  const getMessages = async () => {
    const dataMessage = await axios.get(
      `${BASE_URL}/api/message/get-messages/${chat?._id}`
    )
    try {
      if (dataMessage.status === 200) {
        setMessages(dataMessage?.data)
      }
    } catch (err) {
      console.log(err)
    }
  }

  const dataMessage = {
    chatId: chat?._id,
    senderId: currentUser?._id,
    text: text || null,
  }

  const receiverId = chat?.members.find((id) => id !== currentUser?._id)

  //Use cloudinary
  let fromData = new FormData()
  fromData.append('file', images[0])
  fromData.append('upload_preset', 'yp1zbtgx')

  const sendMessage = async (e) => {
    e.preventDefault()
    setShowUploadImage(false)

    if (text.length > 0 || imageUTLs.length > 0) {
      let imgs = []
      if (imageUTLs.length > 0) {
        await axios({
          method: 'post',
          url: 'https://api.cloudinary.com/v1_1/dwxnmwhdl/image/upload',
          data: fromData,
        })
          .then((res) => {
            imgs.push(res.data.secure_url)
            dataMessage.images = imgs
          })
          .catch((err) => {
            console.log(err)
          })
      }

      //send message in socket
      const messageData = {
        text: text || null,
        senderId: currentUser?._id,
        receiverId: receiverId,
        images: imgs || [],
      }
      socket.current.emit('sendMessage', messageData)

      try {
        const { data } = await axios.post(
          `${BASE_URL}/api/message/send`,
          dataMessage
        )
        // if (data.result.message === 'success') {
        // if (data.result.message === 'success') {
        setMessages([...messages, data.result])
        // }
      } catch (err) {
        console.log(err)
      }
      setText('')
      setImageUTLs([])
      setImages([])
    }
  }

  // scroll auto message
  useEffect(() => {
    scrolRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    getChat()
  }, [currentUser._id])

  useEffect(() => {
    getMessages()
  }, [chat, messages])

  return (
    <div className="   md:static flex-col h-auto md:bg-none md:h-[70vh] md:flex  md:flex-row ">
      <div
        className={
          !chat
            ? 'flex flex-col md:w-[40%] md:border'
            : 'md:flex md:flex-col md:w-[40%] md:border hidden '
        }
      >
        <HeaderConversation key={currentUser._id} currentUser={currentUser} />
        <div className=" md:border-[0.003rem] flex flex-col p-0 overflow-y-scroll relative">
          {usersChats?.chat?.map((chats, index) => (
            <div key={(chats?._id, index)} onClick={() => setChat(chats)}>
              <Conversation
                data={chats}
                messages={messages}
                currentUser={currentUser._id}
              />
            </div>
          ))}
        </div>
      </div>
      <div
        className={
          chat
            ? 'absolute left-0 right-0 top-0 md:static pb-10 md:w-[60%] md:flex md:flex-col md:border md:bg-[#f1f5f9] bg-[#f3f4f6]'
            : 'hidden md:w-[60%] md:flex md:flex-col md:border md:bg-[#f1f5f9] bg-[#f3f4f6]'
        }
      >
        {chat && (
          <HeaderChat
            setChat={setChat}
            data={chat}
            currentUser={currentUser._id}
          />
        )}
        {images?.length > 0 && showUploadImage ? (
          <div className="w-[100%] grid grid-cols-3 pt-16 md:pt-0 h-[70vh] gap-0 backdrop-blur bg-[#f1f5f9] relative overflow-y-scroll">
            {imageUTLs?.map((imageSrc, index) => (
              <div key={index} className="h-[140px] ">
                <img
                  src={imageSrc}
                  alt=""
                  className="h-[140px] object-fill border-[rgb(128,128,128)] border-[1px]  w-[100%]"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className=" overflow-y-scroll md:h-[70vh]">
            {chat ? (
              <div className="pt-16 md:pt-0">
                {messages?.messages?.length > 0 ? (
                  <div>
                    {messages?.messages?.map((msg) => (
                      <div key={msg?._id}>
                        <div ref={scrolRef}>
                          <Message
                            message={msg}
                            currentUser={currentUser}
                            owner={msg?.senderId?._id === currentUser?._id}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center">
                    <EmptyCanal />
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex md:items-center md:bg-[#fafafa] md:justify-between">
                <NoChat />
              </div>
            )}
          </div>
        )}

        {chat && (
          <div className="fixed bottom-0 left-0  md:bg-inherit pt-1 md:pt-0 px-2 md:mx-2 md:my-1 right-0 md:relative md:-bottom-7">
            <div className="flex  w-full relative ">
              <div className="w-[100%] relative ">
                <InputMessage
                  setText={setText}
                  text={text}
                  className="absolute"
                />
                <IoCameraOutline className="absolute top-2 right-0 mr-3" />
                <input
                  onChange={selectFilesHandler}
                  type="file"
                  accept="image/*"
                  className="absolute w-4 h-4 top-2 right-0 mr-3 overflow-hidden cursor-pointer opacity-0"
                />
              </div>
              <div className="flex">
                <button
                  className="bg-[#6173ae] h-[35px] px-3 text-white ml-1 rounded-[50px]"
                  onClick={sendMessage}
                >
                  <FiSend />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatClientSeller
