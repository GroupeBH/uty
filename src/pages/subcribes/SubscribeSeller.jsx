import React, { useState } from 'react'
import { FaCheck } from 'react-icons/fa'
// import { GiCheckMark } from "react-icons/gi";

function SubscribeSeller() {
  const method = {
    mobileMoney: false,
    card: false,
  }
  const [isSelected, setIsSelected] = useState(false)
  const [phoneMobileMoney, setPhoneMobileMoney] = useState(null)

  const [seletedPayment, setSeletedPayment] = useState({})

  //Err
  const [msgErrPayment, setMsgErrPayment] = useState('')
  const [msgErrModePayment, setMsgErrModePayment] = useState('')

  console.log(setMsgErrPayment)
  console.log(setMsgErrModePayment)

  seletedPayment === 'mobilemoney' &&
    (method.mobileMoney = true) &&
    (method.card = false) &&
    setPhoneMobileMoney(null)

  seletedPayment === 'card' &&
    (method.card = true) &&
    (method.mobileMoney = false)

  const handleSubscriptionPlan = () => {
    setIsSelected(true)
  }

  return (
    <div className="px-[16px] md:px-12">
      <h2 className="mt-20 pb-3 md:pt-1 md:pb-6 md:mt-0 font-medium text-[19px]">
        {'Abonnement'}
      </h2>
      {!isSelected ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center leading-6 text-[rgba(0,0,0,0.67)] text-[14px]">
          <div className="bg-[#ffffff] rounded-lg border-[1px] border-[rgba(69,147,224,0.34)] shadow-sidebar py-5 px-5">
            <div>
              <div className="font-bold text-[25px] py-5 text-[rgba(0,0,0,0.87)]">
                Gratuit
              </div>
              <div>
                Lorem Ipsum is dummy duptas et text of the printing and
                typesetting industry
              </div>
              <div className="flex justify-center py-5">
                <div className="flex h-[40px]">
                  <div className="font-medium text-[11px]">$</div>
                  <div className=" text-[50px] m-auto text-primary font-bold px-1">
                    0
                  </div>
                  <div className="pt-5 font-medium text-[11px]">Mois</div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center">
                  {/* <FaCheck className="mr-2 text-[#27b454]" /> */}
                  <FaCheck className="mr-2 text-[#27b454]" />
                  Avantage 1
                </div>
                <div className="flex items-center justify-center">
                  {/* <FaCheck className="mr-2 text-[#27b454]" /> */}
                  <FaCheck className="mr-2 text-[#27b454]" />
                  Avantage 2
                </div>
              </div>
              <div
                className="bg-primary text-white md:w-[65%] m-auto rounded-[3px] py-[5px] mt-3 cursor-pointer"
                onClick={handleSubscriptionPlan}
              >
                En cours...
              </div>
            </div>
          </div>
          <div className="bg-[#ffffff] rounded-lg border-[1px] border-[rgba(69,147,224,0.34)] shadow-sidebar py-5 px-5">
            <div>
              <div className="font-bold text-[25px] py-5 text-[rgba(0,0,0,0.87)]">
                Basique
              </div>
              <div>
                Lorem Ipsum is dummy duptas et text of the printing and
                typesetting industry
              </div>
              <div className="flex justify-center py-5">
                <div className="flex h-[40px]">
                  <div className="font-medium text-[11px]">$</div>
                  <div className=" text-[50px] m-auto text-primary font-bold px-1">
                    5
                  </div>
                  <div className="pt-5 font-medium text-[11px]">Mois</div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center">
                  <FaCheck className="mr-2 text-[#27b454]" />
                  Avantage 1
                </div>
                <div className="flex items-center justify-center">
                  <FaCheck className="mr-2 text-[#27b454]" />
                  Avantage 2
                </div>
                <div className="flex items-center justify-center">
                  <FaCheck className="mr-2 text-[#27b454]" />
                  Avantage 3
                </div>
              </div>
              <div className="bg-primary text-white md:w-[65%] m-auto rounded-[3px] py-[5px] mt-3 cursor-pointer">
                Selectionnner
              </div>
            </div>
          </div>
          <div className="bg-[#ffffff] rounded-lg border-[1px] border-[rgba(69,147,224,0.34)] shadow-sidebar py-5 px-5">
            <div>
              <div className="font-bold text-[25px] py-5 text-[rgba(0,0,0,0.87)]">
                Pro
              </div>
              <div>
                Lorem Ipsum is dummy duptas et text of the printing and
                typesetting industry
              </div>
              <div className="flex justify-center py-5">
                <div className="flex h-[40px]">
                  <div className="font-medium text-[11px]">$</div>
                  <div className=" text-[50px] m-auto text-primary font-bold px-1">
                    20
                  </div>
                  <div className="pt-5 font-medium text-[11px]">/ Ans</div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center">
                  <FaCheck className="mr-2 text-[#27b454]" />
                  Avantage 1
                </div>
                <div className="flex items-center justify-center">
                  <FaCheck className="mr-2 text-[#27b454]" />
                  Avantage 2
                </div>
              </div>
              <div className="bg-primary text-white md:w-[65%] m-auto rounded-[3px] py-[5px] mt-3 cursor-pointer">
                Selectionnner
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className=" mt-8">
          <div className="flex justify-between items-center">
            <label
              htmlFor="pet-select"
              className="text-[rgba(0,0,0,0.8)] text-[13px] font-light"
            >
              Mode de paiement{' '}
            </label>
            {seletedPayment !== 'mobilemoney' && seletedPayment !== 'card' && (
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
      )}
      {method.card && (
        <div>
          <div className="flex flex-col justify-center w-[100%] mb-4">
            <div className="flex justify-between items-center">
              <div className="text-[rgba(0,0,0,0.8)] text-[13px] bg-primary py-[9px] md:py-[5px] rounded-[3px] cursor-pointer text-white mt-2 px-3 font-light">
                {"Cliquez pour continuer l'operation"}
              </div>
            </div>
          </div>
        </div>
      )}
      {method.mobileMoney && (
        <div>
          <div className="flex flex-col w-[100%] mb-4">
            <div className="flex justify-between items-center mt-5">
              <label
                htmlFor=""
                className=" text-[rgba(0,0,0,0.8)] text-[13px] font-light"
              >
                Numero Mobile
              </label>
              {!phoneMobileMoney && (
                <div className="text-[red] font-medium text-[11px] py-0 my-0">
                  {msgErrModePayment}
                </div>
              )}
            </div>
            <input
              onChange={(e) => setPhoneMobileMoney(e.target.value)}
              maxLength="15"
              type="text"
              className="outline-none px-2 py-2 md:py-1 border-[rgba(90,86,86,0.08)] border-[1px] rounded-[4px] focusInput md:w-[42%]"
              placeholder=""
            />
          </div>
          <button
            type="button"
            className="bg-primary text-[15px] cursor-pointer py-2 md:py-1 px-8 md:px-10 mt-2 rounded-[4px] text-white"
          >
            Valider
          </button>
        </div>
      )}
    </div>
  )
}

export default SubscribeSeller
