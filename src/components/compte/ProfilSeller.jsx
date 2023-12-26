import React, { useEffect, useState } from 'react'
import axios from 'axios'
import ProfilUser from '../../assets/profileuser.png'
import { BASE_URL } from '../../helpers/Root'
// import { FiEdit } from 'react-icons/fi'
// import { useNavigate } from 'react-router-dom'

function ProfilSellerUpdate({ sellerId }) {
  const method = {
    mobileMoney: false,
    card: false,
  }

  const [store, setStore] = useState(null)
  const [address, setAddress] = useState(null)
  const [seller, setSeller] = useState(null)
  const [seletedPayment, setSeletedPayment] = useState({})
  const [phoneMobileMoney, setPhoneMobileMoney] = useState(null)
  const [loader, setLoader] = useState(false)
  //   const [file, setFile] = useState(null)
  // const [selectedImage, setSelectedImage] = useState(null)

  //   const navigate = useNavigate()
  console.log(phoneMobileMoney, phoneMobileMoney)

  console.log('seller/id : ', sellerId)
  //   if (!sellerId) {
  //     navigate('/Account/seller')
  //   }

  // function handleChange(e) {
  //   setSelectedImage(e.target.files[0])
  //   setFile(URL.createObjectURL(e.target.files[0]))
  // }

  // useEffect(() => {
  //   if (selectedImage) {
  //     const reader = new FileReader()
  //     reader.readAsDataURL(selectedImage)
  //       reader.onloadend = () => {
  //         setImage(reader.result)
  //       }
  //   }
  // }, [selectedImage])

  // Chate state select method payement
  seletedPayment === 'mobilemoney' &&
    (method.mobileMoney = true) &&
    (method.card = false) &&
    setPhoneMobileMoney(null)

  seletedPayment === 'card' &&
    (method.card = true) &&
    (method.mobileMoney = false)

  //if mode payment isn't seleted return msg error
  seletedPayment === '' && setSeletedPayment({})
  if (sellerId) {
    useEffect(() => {
      const getSeller = async () => {
        const seller = await axios.get(`${BASE_URL}/api/seller/${sellerId}`)
        try {
          console.log('seller : ', seller.data)
          setSeller(seller.data)
        } catch (err) {
          console.log(err)
        }
      }
      getSeller()
    }, [sellerId])
  }

  useEffect(() => {
    setStore(seller?.store)
    setAddress(seller?.address)
  }, [seller])

  const handleUpdateSeller = async () => {
    console.log(store, address)
    setLoader(true)

    const userData = await axios.patch(
      `${BASE_URL}/api/seller/update-seller/${sellerId}`,
      { store, address }
    )

    try {
      if (userData.data.message === 'success') {
        setLoader(false)
        console.log('user', userData.data.message)
      }
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <div className=" bg-white md:h-[550px] px-3 shadow-[0_0px_20px_-15px_rgba(0,0,0,0.3)] rounded-2xl md:px-3 md:pt-8">
      <span className="text-[16px] font-medium">Information du vendeur</span>
      <div className=" leading-6 mt-8">
        <div>
          <input
            type="text"
            value={store}
            onChange={(e) => setStore(e.target.value)}
            placeholder="nom de l'enseigne"
            className="text-[rgb(0,0,0,0.69)] text-[15px] outline-none border-b-gary-400 border-b-[1px] mb-3 focus:border-b-primary transition-all delay-150 ease-in-out px-2"
            // onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <input
            type="text"
            value={address}
            placeholder="adresse du vendeur"
            className="text-[rgb(0,0,0,0.69)] text-[15px] outline-none border-b-gary-400 border-b-[1px] mb-3 focus:border-b-primary transition-all delay-150 ease-in-out px-2"
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className="flex flex-col w-[100%] mb-4 order-3 md:order-none">
          <select
            onChange={(e) => setSeletedPayment(e.target.value)}
            name="pets"
            id="pet-select"
            className="outline-none py-[11px] focus:border-primary transition-all delay-150 ease-in-out px-2 md:py-[7px] border-[rgba(90,86,86,0.08)] border-[1px]  rounded-[4px] text-[13px]"
          >
            <option value="">--Voir le mode de paiement choisi--</option>
            <option value="mobilemoney">Mobile Money</option>
            <option value="card">Numero de la carte</option>
          </select>
        </div>
        <div className="order-3 md:order-none">
          {method.card && (
            <div className="">
              <div className="flex flex-col justify-center w-[100%] mb-4">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor=""
                    className="text-[rgba(0,0,0,0.8)] text-[13px] font-light"
                  >
                    {"Date d'exppiration"}
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="text"
                    maxLength="16"
                    placeholder=""
                    className="outline-none w-[44%] px-2 py-2 md:py-1 border-[rgba(90,86,86,0.08)] border-[1px] mr-1 rounded-[4px] focus:border-b-primary"
                  />
                  <input
                    type="text"
                    placeholder=""
                    maxLength="2"
                    className="outline-none px-2 py-2 md:py-1 border-[rgba(90,86,86,0.08)] border-[1px] focus:border-b-primary w-[16%] text-center rounded-l-[4px]"
                  />
                  <input
                    type="text"
                    placeholder=""
                    maxLength="2"
                    className="outline-none px-2 py-2 md:py-1 border-[rgba(90,86,86,0.08)] border-[1px] focus:border-b-primary w-[16%] text-center mr-2 rounded-r-[4px]"
                  />
                  <input
                    type="text"
                    className="outline-none px-2 py-2 md:py-1 border-[rgba(90,86,86,0.08)] border-[1px] focus:border-b-primary w-[19%] text-center"
                    maxLength="3"
                    placeholder=""
                  />
                </div>
              </div>
            </div>
          )}

          {method.mobileMoney && (
            <div className="">
              <input
                value={seller?.paymentMethod?.phoneMobileMoney}
                maxLength="14"
                placeholder="Numero de contact"
                type="text"
                className="text-[rgb(0,0,0,0.69)] text-[15px] outline-none border-b-gary-400 border-b-[1px] mb-3 focus:border-b-primary transition-all delay-150 ease-in-out px-2"
              />
            </div>
          )}
        </div>
        <div className="h-[25vh] w-[70%] flex">
          <img
            src={seller?.identity ? seller?.identity : ProfilUser}
            alt=""
            className="rounded-lg h-[25vh] md:h-[25vh] w-[100%] object-cover"
          />
          <div className="flex  right-0 p-[10px] md:p-[2px] round ">
            <div className="flex relative md:top-1 left-1 cursor-pointer hover:text-primary font-bold transition-all delay-150 ease-in-out">
              {/* <FiEdit className="text-[20px] absolute bottom-0 " /> */}
              {/* <input
                type="file"
                accept="image/png, image/jpg, image/jpeg"
                className=" w-[5vh] absolute bottom-0 z-2 opacity-0"
                onChange={handleChange}
              /> */}
            </div>
          </div>
        </div>
        <div className="flex mt-2 pb-5 md:pb-0">
          <div
            onClick={handleUpdateSeller}
            className="bg-primary cursor-pointer mt-3 mb-2 md:mt-7 text-[14px] md:m-auto text-white inline-block py-1 px-7 rounded-[3px]"
          >
            {!loader ? 'Modifier' : 'En cours...'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilSellerUpdate
