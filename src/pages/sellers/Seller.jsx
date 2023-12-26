import axios from 'axios'
import React, { useEffect, useState } from 'react'
// import { useNavigate } from 'react-router-dom'
import { BASE_URL } from '../../helpers/Root'

function Seller({ setIsActive }) {
  //strategie to show element seledted
  const method = {
    mobileMoney: false,
    card: false,
  }

  // const navigate = useNavigate()
  //Data categories
  const [categories, setCategories] = useState([])

  const [selectCategory, setSelectCategory] = useState([])
  const [store, setStore] = useState(null)
  const [address, setAddress] = useState(null)
  const [identity, setIdentity] = useState(null)
  const [seletedPayment, setSeletedPayment] = useState({})
  const [phoneMobileMoney, setPhoneMobileMoney] = useState(null)
  const [cardId, setCardId] = useState(null)
  const [monthCard, setMonthCard] = useState('')
  const [yearCard, setYearCard] = useState('')
  const [cvs, setCvs] = useState(null)
  const [selectedImg, setSelectedImg] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  //Message erreur input
  const [msgErrStore, setMsgErrStore] = useState('')
  const [msgErrAddress, setMsgErrAdress] = useState('')
  const [msgErrPayment, setMsgErrPayment] = useState('')
  const [msgErridentity, setMsgErridentity] = useState('')
  const [msgErrCategory, setMsgErrCategory] = useState('')
  const [msgErrModePayment, setMsgErrModePayment] = useState('')

  const expirationDate = monthCard.concat(yearCard)

  //Get currentUser
  useEffect(() => {
    const items = JSON.parse(localStorage.getItem('currentUser'))
    setUser(items)
  }, [])

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

  const getCategories = async () => {
    const categories = await axios.get(`${BASE_URL}/api/categories`)
    try {
      setCategories(categories.data)
    } catch (err) {
      console.log(err)
    }
  }

  useEffect(() => {
    getCategories()
  }, [])

  //Selected Image
  useEffect(() => {
    if (selectedImg) {
      // console.log('img selected', selectedImg)
      const reader = new FileReader()
      reader.readAsDataURL(selectedImg)
      reader.onloadend = () => {
        setIdentity(reader.result)
      }
    }
  }, [selectedImg])

  //Multi Select Category
  const handleSelectCategory = (category) => {
    const arr = []
    arr.push(category)
    if (!selectCategory.includes(category)) {
      setSelectCategory((current) => [...current, ...arr])
    } else {
      const index = selectCategory.indexOf(category)
      setSelectCategory((current) => {
        current.splice(index, 1)
        return [...current]
      })
    }
  }

  //Create a new seller
  const handleSubmit = async (e) => {
    e.preventDefault()
    const paymentMethod = {
      name: seletedPayment,
      phoneMobileMoney: phoneMobileMoney,
      cardId: cardId,
      expirationDate: expirationDate,
      cvs: cvs,
    }

    if (!store) {
      setMsgErrStore('Ce champs est obligatoire')
    } else if (!address) {
      setMsgErrAdress('Ce champs est obligatoire')
    } else if (seletedPayment !== 'mobilemoney' && seletedPayment !== 'card') {
      setMsgErrPayment('Veillez selectionner un mode de paiement')
    } else if (
      !paymentMethod.phoneMobileMoney &&
      !paymentMethod.cardId &&
      !paymentMethod.expirationDate &&
      !paymentMethod.cvs
    ) {
      setMsgErrModePayment('Ce champs est obligatoire')
    } else if (!identity) {
      setMsgErridentity('Ce champs est obligatoire')
    } else if (selectCategory.length < 1) {
      setMsgErrCategory("C'est un champs requié")
    } else {
      setLoading(true)

      const { data } = await axios.post(`${BASE_URL}/api/seller/create`, {
        user: user._id,
        store: store,
        category: selectCategory,
        identity,
        address,
        paymentMethod,
      })

      try {
        if (data.message === 'success') {
          // console.log('data store: ', data.data._id)
          localStorage.setItem('seller', JSON.stringify(data.data._id))
          // window.location.reload(false)
          setIsActive(true)
          console.log('data : ', data)

          // navigate('/Account/')
        }
      } catch (err) {
        console.log(err)
      }
    }
  }

  return (
    <div>
      <h2 className="mt-20 pb-7 md:pt-1 px-[16px] md:px-0 md:pb-6 md:mt-0 font-medium text-[19px]">
        Devenir vendeur
      </h2>
      <form action="#" className="px-[16px] md:px-0">
        <div className="grid md:grid-cols-2 gap-x-10 ">
          <div className="flex flex-col w-[100%] order-1 mb-4 md:order-none">
            <div className="flex justify-between items-center">
              <label
                htmlFor="store"
                className="text-[rgba(0,0,0,0.9)] text-[13px] font-light"
              >
                {"Nom de l'enseigne"}
              </label>
              {!store && (
                <div className="text-[red] font-medium text-[11px] py-0 my-0">
                  {msgErrStore}
                </div>
              )}
            </div>
            <input
              onChange={(e) => setStore(e.target.value)}
              type="text"
              placeholder=""
              id="store"
              className="outline-none px-3 py-2 md:py-1 border-[rgba(90,86,86,0.08)] border-[1px] rounded-[4px] focusInput"
              required
            />
          </div>
          <div className="flex flex-col w-[100%] order-2 mb-4 md:order-none">
            <div className="flex justify-between items-center">
              <label
                htmlFor=""
                className="text-[rgba(0,0,0,0.8)] text-[13px] font-light"
              >
                Adresse du vendeur
              </label>
              {!address && (
                <div className="text-[red] font-medium text-[11px] py-0 my-0">
                  {msgErrAddress}
                </div>
              )}
            </div>
            <input
              onChange={(e) => setAddress(e.target.value)}
              type="text"
              placeholder=""
              className="outline-none px-3 py-2 md:py-1 border-[rgba(90,86,86,0.08)] border-[1px]  rounded-[4px] focusInput"
            />
          </div>
          <div className="flex flex-col w-[100%] mb-4 order-3 md:order-none">
            <div className="flex justify-between items-center">
              <label
                htmlFor="pet-select"
                className="text-[rgba(0,0,0,0.8)] text-[13px] font-light"
              >
                Mode de paiement{' '}
              </label>
              {seletedPayment !== 'mobilemoney' &&
                seletedPayment !== 'card' && (
                  <div className="text-[red] font-medium text-[11px] py-0 my-0">
                    {msgErrPayment}
                  </div>
                )}
            </div>
            <select
              onChange={(e) => setSeletedPayment(e.target.value)}
              name="pets"
              id="pet-select"
              className="outline-none px-3 py-[11px] md:py-[7px] border-[rgba(90,86,86,0.08)] border-[1px]  rounded-[4px] text-[13px] focusInput"
            >
              <option value="">--Choisir un mode de paiement--</option>
              <option value="mobilemoney">Mobile Money</option>
              <option value="card">Numero de la carte</option>
            </select>
          </div>

          <div className="order-3 md:order-none">
            {method.card && (
              <div className="">
                <div className="flex flex-col justify-center w-[100%] mb-4">
                  <div className="flex justify-between items-center">
                    {!cardId &&
                      !monthCard &&
                      !yearCard &&
                      !cvs &&
                      !phoneMobileMoney && (
                        <div className="text-[red] font-medium text-[11px] py-0 my-0">
                          {msgErrModePayment}
                        </div>
                      )}
                  </div>
                  <div className="grid grid-cols-3">
                    <div className="flex flex-col">
                      <label
                        htmlFor=""
                        className="text-[rgba(0,0,0,0.8)] text-[13px] font-light"
                      >
                        Numero de la carte
                      </label>
                      <input
                        onChange={(e) => setCardId(e.target.value)}
                        type="text"
                        maxLength="16"
                        placeholder=""
                        className="outline-none w-[95%] px-2 py-2 md:py-1 border-[rgba(90,86,86,0.08)] border-[1px] mr-1 rounded-[4px] focusInput"
                      />
                      {!cardId && (
                        <div className="text-[red] font-medium text-[11px] py-0 my-0">
                          {msgErrModePayment}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <label
                        htmlFor=""
                        className="text-[rgba(0,0,0,0.8)] text-[13px] font-light"
                      >
                        Date d{"'"}expiration
                      </label>
                      <div>
                        <input
                          onChange={(e) => setMonthCard(e.target.value)}
                          type="text"
                          placeholder=""
                          maxLength="2"
                          className="outline-none px-2 py-2 md:py-1 border-[rgba(90,86,86,0.08)] border-[1px] focusInput w-[45%] text-center rounded-l-[4px]"
                        />
                        <input
                          onChange={(e) => setYearCard(e.target.value)}
                          type="text"
                          placeholder=""
                          maxLength="2"
                          className="outline-none px-2 py-2 md:py-1 border-[rgba(90,86,86,0.08)] border-[1px] focusInput w-[45%] text-center mr-2 rounded-r-[4px]"
                        />
                      </div>
                      {!monthCard && !yearCard && (
                        <div className="text-[red] font-medium text-[11px] py-0 my-0">
                          {msgErrModePayment}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <label
                        htmlFor=""
                        className="text-[rgba(0,0,0,0.8)] text-[13px] font-light"
                      >
                        CVS
                      </label>

                      <input
                        onChange={(e) => setCvs(e.target.value)}
                        type="text"
                        className="outline-none px-2 py-2 md:py-1 border-[rgba(90,86,86,0.08)] border-[1px] focusInput w-[60%] text-center"
                        maxLength="3"
                        placeholder=""
                      />
                      {!cvs && (
                        <div className="text-[red] font-medium text-[11px] py-0 my-0">
                          {msgErrModePayment}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {method.mobileMoney && (
              <div className="flex flex-col w-[100%] mb-4 ">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor=""
                    className=" text-[rgba(0,0,0,0.8)] text-[13px] font-light"
                  >
                    Numero Mobile
                  </label>
                  {!cardId &&
                    !monthCard &&
                    !yearCard &&
                    !cvs &&
                    !phoneMobileMoney && (
                      <div className="text-[red] font-medium text-[11px] py-0 my-0">
                        {msgErrModePayment}
                      </div>
                    )}
                </div>
                <input
                  onChange={(e) => setPhoneMobileMoney(e.target.value)}
                  maxLength="14"
                  type="text"
                  className="outline-none px-2 py-1 border-[rgba(90,86,86,0.08)] border-[1px] rounded-[4px] focusInput w-[42%]"
                  placeholder=""
                />
              </div>
            )}
          </div>
          <div className="flex flex-col w-[100%] mb-4 order-5 md:order-none">
            <div className="flex justify-between items-center">
              <label
                className="text-[rgba(0,0,0,0.8)] text-[13px] font-light"
                htmlFor="file"
              >
                {"importer une piece d'indentitée"}
              </label>
              {!identity && (
                <div className="text-[red] font-medium text-[11px] py-0 my-0">
                  {msgErridentity}
                </div>
              )}
            </div>
            <input
              onChange={(e) => setSelectedImg(e.target.files[0])}
              className="block outline-none px-2 py-2 md:py-1 border-[rgba(90,86,86,0.08)] border-[1px] rounded-[4px] focusInput w-full text-sm text-gray-900  border-gray-300 cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
              id="file"
              type="file"
            />
          </div>
        </div>
        <div className="flex flex-col w-[100%] mb-4">
          <div className="flex justify-between items-center">
            <label
              htmlFor=""
              className="text-[rgba(0,0,0,0.8)] text-[13px] font-light mb-2"
            >
              Selectionner categorie(es)
            </label>
            {!selectCategory.length && (
              <div className="text-[red] font-medium text-[11px] py-0 my-0">
                {msgErrCategory}
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
            {categories.map((category, index) => (
              <div
                onClick={() => handleSelectCategory(category._id, index)}
                key={category._id}
                // className="bg-primary shadow-lg text-[13px] font-light py-[6px] text-white px-2 rounded-md cursor-pointer  transition ease-in-out delay-150"
                className={
                  selectCategory.includes(category._id)
                    ? 'bg-secondary shadow-lg text-[13px] font-light py-[6px] text-white px-2 rounded-md cursor-pointer  transition ease-in-out delay-150'
                    : 'bg-[#999494] shadow-lg text-[13px] font-light py-[6px] text-white px-2 rounded-md cursor-pointer  transition ease-in-out delay-150'
                }
              >
                {category.name}
              </div>
            ))}
          </div>
        </div>
        {/* <button
          type="button"
          onClick={handleSubmit}
          className="bg-primary text-[15px] cursor-pointer py-2 md:py-1 px-8 md:px-10 mt-2 rounded-[4px] text-white"
        >
          Valider
        </button> */}
        <div className="">
          <button
            className="bg-[#3b5998]  text-[15px] hover:bg-[#3b5998] focus:ring-4 focus:outline-none cursor-pointer py-2 md:py-2 px-8 md:px-10 mt-2 rounded-[4px] text-white"
            onClick={(e) => handleSubmit(e)}
          >
            {loading ? (
              <div className="">Operation...</div>
            ) : (
              <div className="">Devenir vendeur</div>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Seller
